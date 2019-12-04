import Notifications from '../schemas/Notifications';
import User from '../models/User';

class NotificationController{
    async update(req, res)
    {
        const notification = await Notifications.findByIdAndUpdate(
            req.params.id, 
            { read: true },
            { new: true }
        );


        return res.json(notification);
    }
    async index(req, res)
    {
        const providerExists = await User.findOne({
            where: { id: req.userId, provider: true },
        });
        if(!providerExists)
        {
            return res.status(401).json({ error: 'You arent provider'});
        };

        const notifications = await Notifications.find({
            user: req.userId
        }).sort('createdAt').limit(20);

        return res.json(notifications)
    }
}

export default new NotificationController();