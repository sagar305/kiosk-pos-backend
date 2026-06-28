import Category from '../models/Category.js';
import Tax from '../models/Tax.js';
import Ingredient from '../models/Ingredient.js';
import Product from '../models/Product.js';
import { toStockQty } from '../utils/unitConversion.js';
import { getAnthropicClient } from './anthropicClient.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 8;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Guides the model through a structured product-creation interview instead
// of letting it free-form a payload: ingredients first (so COGS is grounded
// in real ingredient costs), then customisations/combo, then price-or-margin,
// then an explicit confirmation before anything is actually written.
const SYSTEM_PROMPT = `You are the in-app assistant for a restaurant/kiosk POS system. You help the
owner/manager create a new menu product (or combo) through conversation, and
can also answer questions about existing products, categories and stock using
the read-only tools.

When the user wants to CREATE A PRODUCT, follow this flow, asking one thing at
a time (don't dump every question in one message):
1. Ask the product name, and whether it's a regular product or a combo.
2. Ask which category it belongs to. Call list_categories to show existing
   options; if the user wants a new one, call create_category.
3. Ask for the recipe ingredients one at a time: ingredient name, quantity,
   and unit. For each one, call search_ingredients to find it and its cost.
   If it doesn't exist yet, ask for its stock unit (g/kg/ml/l/pc) and cost per
   unit, then call create_ingredient. Keep collecting until the user says
   they're done adding ingredients.
4. Ask if they want any customisation groups (e.g. "Size" with Small/Large) or
   add-ons, each with an optional price delta and optional extra ingredients.
   This is optional — skip if the user says no.
5. If it's a combo, ask which existing products are bundled, with quantity and
   any price delta for each. Use list_categories/search results as needed.
6. Ask which taxes apply (call list_taxes); optional.
7. Once ingredients are finalized, call compute_cogs with the full recipe to
   get the exact cost of goods sold. Tell the user the COGS clearly.
8. Ask: "Would you like to set an exact selling price, or tell me the profit
   margin percentage you want and I'll calculate the price for you?"
   - If they give a price directly, use it as-is.
   - If they give a margin %, call compute_price_from_margin with the COGS and
     that margin to get the exact price. Show the resulting price and the
     resulting margin back to them.
9. Summarize the full product (name, category, type, price, COGS, margin%,
   ingredients, customisations, combo items, taxes) and explicitly ask
   "Should I create this product?" before doing anything.
10. Only after the user clearly confirms (e.g. "yes", "create it", "go ahead"),
    call create_product with the complete payload, including cogs and
    marginPercent if a margin was used. Never call create_product before an
    explicit confirmation, and never invent ingredient costs or IDs — always
    get them from search_ingredients/create_ingredient.

Quantities for recipe lines must be in the ingredient's recipe unit (grams for
a kg ingredient, ml for a litre ingredient, pieces for a pc ingredient) — this
is what search_ingredients/create_ingredient return as "recipeUnit".

Keep replies short and conversational. If the user asks to look something up
(e.g. "how many products do we have", "show low margin items") instead of
creating a product, use the read-only tools to answer directly.`;

const TOOL_DEFINITIONS = [
  {
    name: 'list_categories',
    description: 'List all existing menu categories for this business/outlet.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_category',
    description: 'Create a new menu category.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'list_taxes',
    description: 'List all tax rates configured for this business.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'search_ingredients',
    description:
      'Search existing ingredients by name (case-insensitive partial match). Returns each ingredient\'s id, stock unit, recipeUnit (the unit recipe quantities must be entered in) and costPerUnit (cost per stock unit).',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'create_ingredient',
    description: 'Create a new ingredient when one the user mentioned does not exist yet.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        unit: { type: 'string', enum: ['g', 'kg', 'ml', 'l', 'pc'], description: 'Stock unit.' },
        costPerUnit: { type: 'number', description: 'Cost per one stock unit.' },
        stockQty: { type: 'number', description: 'Opening stock quantity, optional.' },
      },
      required: ['name', 'unit', 'costPerUnit'],
    },
  },
  {
    name: 'compute_cogs',
    description:
      'Given a recipe (list of ingredientId + qty in the ingredient\'s recipe unit), deterministically computes the total cost of goods sold and a per-line breakdown. Always use this instead of doing the math yourself.',
    input_schema: {
      type: 'object',
      properties: {
        recipe: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ingredientId: { type: 'string' },
              qty: { type: 'number' },
            },
            required: ['ingredientId', 'qty'],
          },
        },
      },
      required: ['recipe'],
    },
  },
  {
    name: 'compute_price_from_margin',
    description:
      'Given a COGS amount and a desired profit margin percentage, computes the selling price needed to hit that margin (price = cogs / (1 - margin/100)). Always use this instead of doing the math yourself.',
    input_schema: {
      type: 'object',
      properties: {
        cogs: { type: 'number' },
        marginPercent: { type: 'number' },
      },
      required: ['cogs', 'marginPercent'],
    },
  },
  {
    name: 'create_product',
    description:
      'Creates the product. Only call this after the user has explicitly confirmed the full summary.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        categoryId: { type: 'string' },
        type: { type: 'string', enum: ['product', 'combo'], default: 'product' },
        price: { type: 'number' },
        cogs: { type: 'number' },
        marginPercent: { type: 'number' },
        available: { type: 'boolean', default: true },
        taxIds: { type: 'array', items: { type: 'string' } },
        recipe: {
          type: 'array',
          items: {
            type: 'object',
            properties: { ingredientId: { type: 'string' }, qty: { type: 'number' } },
            required: ['ingredientId', 'qty'],
          },
        },
        customisations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              selectionType: { type: 'string', enum: ['single', 'multiple'] },
              required: { type: 'boolean' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    priceDelta: { type: 'number' },
                    recipe: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: { ingredientId: { type: 'string' }, qty: { type: 'number' } },
                      },
                    },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['name', 'options'],
          },
        },
        comboItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              qty: { type: 'number' },
              priceDelta: { type: 'number' },
            },
            required: ['productId'],
          },
        },
      },
      required: ['name', 'categoryId', 'price'],
    },
  },
];

function recipeLineCost(ingredient, qty) {
  return toStockQty(ingredient.unit, qty) * ingredient.costPerUnit;
}

async function executeTool(name, input) {
  switch (name) {
    case 'list_categories': {
      const categories = await Category.find({ active: true }).sort({ sortOrder: 1, name: 1 });
      return categories.map((c) => ({ id: c._id, name: c.name }));
    }

    case 'create_category': {
      const category = await Category.create({ name: input.name });
      return { id: category._id, name: category.name };
    }

    case 'list_taxes': {
      const taxes = await Tax.find({ active: true });
      return taxes.map((t) => ({ id: t._id, name: t.name, percent: t.percent }));
    }

    case 'search_ingredients': {
      const regex = new RegExp(input.query, 'i');
      const ingredients = await Ingredient.find({ name: regex, active: true }).limit(10);
      return ingredients.map((i) => ({
        id: i._id,
        name: i.name,
        unit: i.unit,
        recipeUnit: i.recipeUnit,
        costPerUnit: i.costPerUnit,
        stockQty: i.stockQty,
      }));
    }

    case 'create_ingredient': {
      const ingredient = await Ingredient.create({
        name: input.name,
        unit: input.unit,
        costPerUnit: input.costPerUnit,
        stockQty: input.stockQty || 0,
      });
      return {
        id: ingredient._id,
        name: ingredient.name,
        unit: ingredient.unit,
        recipeUnit: ingredient.recipeUnit,
        costPerUnit: ingredient.costPerUnit,
      };
    }

    case 'compute_cogs': {
      const ids = input.recipe.map((l) => l.ingredientId);
      const ingredients = await Ingredient.find({ _id: { $in: ids } });
      const byId = new Map(ingredients.map((i) => [String(i._id), i]));
      const lines = [];
      let total = 0;
      for (const line of input.recipe) {
        const ingredient = byId.get(String(line.ingredientId));
        if (!ingredient) {
          return { error: `Unknown ingredientId ${line.ingredientId}` };
        }
        const cost = round2(recipeLineCost(ingredient, line.qty));
        total += cost;
        lines.push({ ingredientId: line.ingredientId, name: ingredient.name, qty: line.qty, cost });
      }
      return { lines, totalCogs: round2(total) };
    }

    case 'compute_price_from_margin': {
      const { cogs, marginPercent } = input;
      if (marginPercent >= 100 || marginPercent < 0) {
        return { error: 'marginPercent must be between 0 and 100 (exclusive of 100).' };
      }
      const price = round2(cogs / (1 - marginPercent / 100));
      return { price, cogs: round2(cogs), marginPercent };
    }

    case 'create_product': {
      const recipe = (input.recipe || []).map((l) => ({ ingredient: l.ingredientId, qty: l.qty }));
      const customisations = (input.customisations || []).map((g) => ({
        name: g.name,
        selectionType: g.selectionType || 'single',
        required: !!g.required,
        options: (g.options || []).map((o) => ({
          name: o.name,
          priceDelta: o.priceDelta || 0,
          recipe: (o.recipe || []).map((l) => ({ ingredient: l.ingredientId, qty: l.qty })),
        })),
      }));
      const comboItems = (input.comboItems || []).map((c) => ({
        product: c.productId,
        qty: c.qty || 1,
        priceDelta: c.priceDelta || 0,
      }));

      const product = await Product.create({
        name: input.name,
        category: input.categoryId,
        type: input.type || 'product',
        price: input.price,
        cogs: input.cogs,
        marginPercent: input.marginPercent,
        available: input.available !== false,
        taxIds: input.taxIds || [],
        recipe,
        customisations,
        comboItems,
      });

      return {
        id: product._id,
        itemCode: product.itemCode,
        name: product.name,
        price: product.price,
        cogs: product.cogs,
        marginPercent: product.marginPercent,
      };
    }

    default:
      return { error: `Unknown tool ${name}` };
  }
}

export async function runAssistantTurn(session, userMessage) {
  const anthropic = getAnthropicClient();
  session.messages.push({ role: 'user', content: userMessage });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages: session.messages,
    });

    session.messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((block) => block.type === 'tool_use');
    if (toolUses.length === 0) {
      const reply = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
      return { reply, createdProduct: session.lastCreatedProduct };
    }

    const toolResults = [];
    for (const toolUse of toolUses) {
      let result;
      try {
        result = await executeTool(toolUse.name, toolUse.input);
      } catch (err) {
        result = { error: err.message };
      }
      if (toolUse.name === 'create_product' && !result.error) {
        session.lastCreatedProduct = result;
      }
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
    }
    session.messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply: "Sorry, I'm having trouble finishing that request — could you simplify it or try again?",
    createdProduct: session.lastCreatedProduct,
  };
}
