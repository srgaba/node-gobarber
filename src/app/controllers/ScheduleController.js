import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import User from '../models/User'
import Appointments from '../models/Appointments';

class ScheduleController
{
    async index (req, res)
    {
        const providerExists = await User.findOne({
            where: { id: req.userId, provider: true },
        });
        if(!providerExists)
        {
            return res.status(401).json({ error: 'You arent provider'});
        }

        const { date } = req.query;
        const parsedDate = parseISO(date)
        const appointments = await Appointments.findAll({
            where: {
                provider_id: req.userId,
                canceled_at: null, 
                date: {
                    [Op.between]: [
                        startOfDay(parsedDate),
                        endOfDay(parsedDate),
                    ]
                },
            }
        })

        return res.json(appointments);
    }   
}

export default new ScheduleController();