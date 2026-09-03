import { getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';

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
  userId?: string;
  facilityName: string;
  appointmentType: 'IN_PERSON' | 'VIRTUAL_TELEHEALTH';
  requestedDate: string;
  notes?: string;
}

export interface PrescriptionOrderRequest {
  userId?: string;
  pharmacyId: string;
  prescriptionDetails: string;
  deliveryAddress: string;
  phone?: string;
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

  static async bookAppointment(req: AppointmentBookingRequest) {
    const db = getOfflineDb();
    const id = `BKG-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = req.userId || 'demo-patient-001';
    const stmt = db.prepare(`
      INSERT INTO hospital_appointments (id, user_id, facility_name, appointment_type, requested_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      req.facilityName,
      req.appointmentType || 'IN_PERSON',
      req.requestedDate || new Date().toISOString().split('T')[0],
      'CONFIRMED'
    );

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('hospital_appointments').upsert({
          id,
          user_id: userId,
          facility_name: req.facilityName,
          appointment_type: req.appointmentType || 'IN_PERSON',
          requested_date: req.requestedDate || new Date().toISOString().split('T')[0],
          status: 'CONFIRMED'
        });
      } catch { /* ignore */ }
    }

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

    let pharmacyName = 'Accredited Pharmacy';
    if (req.pharmacyId) {
      const pStmt = db.prepare(`SELECT name FROM accredited_pharmacies WHERE id = ?`);
      const p = pStmt.get(req.pharmacyId) as any;
      if (p && p.name) pharmacyName = p.name;
    }

    const stmt = db.prepare(`
      INSERT INTO prescription_orders
      (id, user_id, pharmacy_id, pharmacy_name, prescription_details, delivery_address, contact_phone, status, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSING', 'pending')
    `);

    stmt.run(
      orderId,
      req.userId || 'demo-patient-001',
      req.pharmacyId || 'PHARM-001',
      pharmacyName,
      req.prescriptionDetails,
      req.deliveryAddress,
      req.phone || ''
    );

    return {
      orderId,
      status: 'PROCESSING',
      estimatedDelivery: 'Within 24 hours',
      pharmacyId: req.pharmacyId,
      pharmacyName,
      deliveryAddress: req.deliveryAddress,
      message: `Prescription order ${orderId} received. ${pharmacyName} will contact ${req.phone} shortly.`
    };
  }

  static getPrescriptionOrders(userId: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM prescription_orders WHERE user_id = ? ORDER BY created_at DESC`);
    return stmt.all(userId);
  }

  static getAppointments(userId: string) {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM hospital_appointments WHERE user_id = ? ORDER BY created_at DESC`);
    return stmt.all(userId);
  }
}

