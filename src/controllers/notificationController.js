import Notification from '../models/Notification.js';

export const listNotifications = async (req, res) => {
  const filter = { roles: req.user.role };
  if (req.query.unread === 'true') filter.read = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(notifications);
};

export const markNotificationRead = async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ error: 'Not found' });
  res.json(notification);
};
