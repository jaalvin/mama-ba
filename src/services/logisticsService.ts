import { getOfflineDb } from '../config';

export interface PharmacyQuery {
  region?: string;
  district?: string;
  search?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  region: string;
  district: string;
  phoneNumber: string;
  address: string;
  hasDelivery: boolean;
  isOpenNow: boolean;
}

export interface AppointmentBookingRequest {
  userId: string;
  facilityName: string;
  appointmentType: 'IN_PERSON' | 'VIRTUAL';
  requestedDate: string;
  notes?: string;
}

export interface PrescriptionOrderRequest {
  userId: string;
  pharmacyId: string;
  prescriptionDetails: string;
  deliveryAddress: string;
  phone: string;
}

export class LogisticsService {
  static getPharmacies(query: PharmacyQuery = {}): Pharmacy[] {
    const db = getOfflineDb();
    let sql = `SELECT * FROM accredited_pharmacies WHERE 1=1`;
    const params: any[] = [];

    if (query.region) {
      sql += ` AND LOWER(region) LIKE ?`;
      params.push(`%${query.region.toLowerCase()}%`);
    }
    if (query.district) {
      sql += ` AND LOWER(district) LIKE ?`;
      params.push(`%${query.district.toLowerCase()}%`);
    }
    if (query.search) {
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(address) LIKE ? OR LOWER(district) LIKE ?)`;
      const term = `%${query.search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY name ASC`;

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: string;
      name: string;
      region: string;
      district: string;
      phone_number: string;
      address: string;
      has_delivery: number;
      is_open_now: number;
    }>;

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      region: r.region,
      district: r.district,
      phoneNumber: r.phone_number,
      address: r.address,
      hasDelivery: Boolean(r.has_delivery),
      isOpenNow: Boolean(r.is_open_now)
    }));
  }

  static bookAppointment(req: AppointmentBookingRequest) {
    const db = getOfflineDb();
    const id = `BKG-${Math.floor(1000 + Math.random() * 9000)}`;
    const stmt = db.prepare(`
      INSERT INTO hospital_appointments (id, user_id, facility_name, appointment_type, requested_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      req.userId || 'demo-patient-001',
      req.facilityName,
      req.appointmentType || 'IN_PERSON',
      req.requestedDate || new Date().toISOString().split('T')[0],
      'CONFIRMED'
    );

    return {
      bookingId: id,
      facilityName: req.facilityName,
      appointmentType: req.appointmentType,
      requestedDate: req.requestedDate,
      status: 'CONFIRMED',
      confirmationMessage: `Appointment booked successfully for ${req.requestedDate} at ${req.facilityName}.`
    };
  }

  static orderPrescription(req: PrescriptionOrderRequest) {
    const db = getOfflineDb();
    const orderId = `RX-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      orderId,
      status: 'PROCESSING',
      estimatedDelivery: 'Within 24 hours',
      pharmacyId: req.pharmacyId,
      deliveryAddress: req.deliveryAddress,
      message: `Prescription order ${orderId} received. The pharmacy will contact ${req.phone} shortly.`
    };
  }

  static getAppointments(userId: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM hospital_appointments WHERE user_id = ? ORDER BY created_at DESC`);
    return stmt.all(userId);
  }
}
