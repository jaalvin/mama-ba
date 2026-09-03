import { Router, Request, Response } from 'express';
import { LogisticsService } from '../services/logisticsService';

const router = Router();

// GET /api/v1/logistics/pharmacies?region=...&district=...&search=...
router.get('/pharmacies', (req: Request, res: Response) => {
  try {
    const { region, district, search } = req.query;
    const pharmacies = LogisticsService.getPharmacies({
      region: region as string,
      district: district as string,
      search: search as string
    });
    res.json({ success: true, count: pharmacies.length, data: pharmacies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/logistics/appointments/book
router.post('/appointments/book', async (req: Request, res: Response) => {
  try {
    const { userId, facilityName, appointmentType, requestedDate, notes } = req.body;
    if (!facilityName) {
      return res.status(400).json({ success: false, error: 'facilityName is required' });
    }
    const result = await LogisticsService.bookAppointment({
      userId,
      facilityName,
      appointmentType,
      requestedDate,
      notes
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/logistics/appointments/:userId
router.get('/appointments/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const appointments = await LogisticsService.getAppointments(userId);
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/logistics/prescription/order
router.post('/prescription/order', (req: Request, res: Response) => {
  try {
    const { userId, pharmacyId, prescriptionDetails, deliveryAddress, phone } = req.body;
    if (!prescriptionDetails || !deliveryAddress) {
      return res.status(400).json({ success: false, error: 'prescriptionDetails and deliveryAddress are required' });
    }
    const result = LogisticsService.orderPrescription({
      userId,
      pharmacyId,
      prescriptionDetails,
      deliveryAddress,
      phone
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/logistics/prescriptions/:userId
router.get('/prescriptions/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const orders = LogisticsService.getPrescriptionOrders(userId);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

