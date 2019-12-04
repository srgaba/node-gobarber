import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointments';
import pt from 'date-fns/locale/pt';
import { startOfHour, parseISO, format, subHours, isBefore } from 'date-fns';
import * as Yup from 'yup'
import Notification from '../schemas/Notifications';
import Mail from '../../lib/Mail';


class Appointments
{
    async index(req, res)
    {
        const  { page } = req.query;

        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null, },
            order: ['date'],
            limit: 20, 
            offset: (page - 1) * 20,
            include: 
            [
                {
                    model: User, 
                    as: 'provider', 
                    attributes: ['id', 'name'],
                    include: [{
                        model: File,
                        attributes: ['path', 'url', 'name'] 
                    }],
                }
            ]
        });
        return res.json(appointments);
    }

    async store(req, res)
    {
        const schema = Yup.object().shape({
            provider_id: Yup.number().required(),
            date: Yup.date().required()
        });
        if(!(await schema.isValid(req.body)))
        {
            return res.status(401).json({ error: 'Validations fails'});
        }

        const { provider_id, date } = req.body;
        const providerExists = await User.findOne({
            where: { id: provider_id, provider: true }
        });
        if(!providerExists)
        {
            return res.status(401).json({ error: 'Provider not exists'});
        }

        const user  = await User.findByPk(req.userId);
        if(!(user.id == provider_id))
        {
            return res.status(401).json({ error: 'What fuck'});
        }

        const hourStart = startOfHour(parseISO(date));
        const checkAvailability = await Appointment.findOne({
            where: {
                provider_id,
                date: hourStart, 
            },
        });
        if (checkAvailability)
        {
            return res.status(400).json({ error: 'Past date are not permited!'});
        }

        const appointment = await Appointment.create({
            user_id: req.userId,
            provider_id, 
            date,
        });

        const formattedDate = format(
            hourStart, 
            "'dia' dd 'de' MMMM', ás ' H:mm'h'", 
            { locale: pt }
        )
        await Notification.create({
            content: `Novo agendamento de ${user.name} para ${formattedDate}`,
            user: provider_id
        });

        return res.json(appointment);
    }

    async delete(req, res)
    {
        const appointment = await Appointment.findByPk(req.params.id, { 
            include: 
            [{
                model: User, 
                as: 'provider', 
                attributes: ['name', 'email']
            }, 
            {
                model: User, 
                as: 'user',
                attributes: ['name']
            }]
         });

        if(appointment.user_id != req.userId)
        {
            return res.status(401).json({ error: "You don't have permission to cancel this appointment"})
        }

        const dateWithSub = subHours(appointment.date, 2);
        if (isBefore(dateWithSub, new Date()))
        {
            return res.status(401).json({ error: 'You can only cancel appointment 2 hour in advance'});
        }

        appointment.canceled_at = new Date();
        await appointment.save();

        await Mail.sendMail({ 
            to: `${appointment.provider.name} <${appointment.provider.email}>`,
            subject : 'Agendamento',
            template: 'cancellation',
            context: {
                provider: appointment.provider.name,
                user: appointment.user.name,
                date: format( appointment.date,  "'dia' dd 'de' MMMM', ás ' H:mm'h'",  { locale: pt })
            },
         });

        return res.json(appointment);
    }
}

export default new Appointments();