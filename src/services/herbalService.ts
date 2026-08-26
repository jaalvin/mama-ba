import { getOfflineDb } from '../config';

export interface HerbalSafetyRequest {
  herbName?: string;
  pharmaDrugName?: string;
  foodItem?: string;
}

export interface HerbalSafetyResponse {
  severity: 'SAFE' | 'CAUTION' | 'DANGER' | 'NO_KNOWN_INTERACTION';
  herbName: string;
  pharmaDrugName: string;
  foodItem: string | null;
  interactionDetails: string;
  culturalAdviceTwi: string;
  culturalAdviceEnglish: string;
  allRecordsChecked: number;
}

export class HerbalService {
  /**
   * Evaluate potential contraindications between Ghanaian herbal remedies, pharmaceutical drugs, and local foods.
   */
  static checkSafety(req: HerbalSafetyRequest): HerbalSafetyResponse {
    const db = getOfflineDb();

    const herb = (req.herbName || '').trim().toLowerCase();
    const drug = (req.pharmaDrugName || '').trim().toLowerCase();
    const food = (req.foodItem || '').trim().toLowerCase();

    const stmt = db.prepare(`SELECT * FROM herbal_drug_matrix`);
    const allRecords = stmt.all() as Array<{
      id: string;
      herb_name: string;
      herb_aliases: string;
      pharma_drug_name: string;
      food_item: string | null;
      severity: 'SAFE' | 'CAUTION' | 'DANGER';
      interaction_details: string;
      cultural_advice_twi: string;
      cultural_advice_english: string;
    }>;

    for (const record of allRecords) {
      const dbHerbName = record.herb_name.toLowerCase();
      const aliases: string[] = JSON.parse(record.herb_aliases || '[]').map((a: string) => a.toLowerCase());
      const dbDrugName = record.pharma_drug_name.toLowerCase();
      const dbFoodItem = (record.food_item || '').toLowerCase();

      const herbMatch = herb === '' || dbHerbName.includes(herb) || aliases.some(a => a.includes(herb) || herb.includes(a));
      const drugMatch = drug === '' || dbDrugName.includes(drug) || drug.includes(dbDrugName.split(' ')[0]);
      const foodMatch = food === '' || (dbFoodItem !== '' && (dbFoodItem.includes(food) || food.includes(dbFoodItem)));

      if (herbMatch && drugMatch && foodMatch && (herb !== '' || drug !== '' || food !== '')) {
        return {
          severity: record.severity,
          herbName: record.herb_name,
          pharmaDrugName: record.pharma_drug_name,
          foodItem: record.food_item,
          interactionDetails: record.interaction_details,
          culturalAdviceTwi: record.cultural_advice_twi,
          culturalAdviceEnglish: record.cultural_advice_english,
          allRecordsChecked: allRecords.length
        };
      }
    }

    return {
      severity: 'NO_KNOWN_INTERACTION',
      herbName: req.herbName || 'None Specified',
      pharmaDrugName: req.pharmaDrugName || 'None Specified',
      foodItem: req.foodItem || null,
      interactionDetails: 'No direct documented severe contraindication found in the Apomuden local database. However, always space herbal teas and prescribed medicines by at least 2 hours.',
      culturalAdviceTwi: 'Nnuru ne herb foforɔ a wote no, twɛn dɔnhwerew 2 ansa na wanom na ammma w\'aduru adwumayɛ anntɔ ase.',
      culturalAdviceEnglish: 'Always space herbal teas and pharmaceutical medicines by 2 hours during pregnancy.',
      allRecordsChecked: allRecords.length
    };
  }

  /**
   * List all Ghanaian herbal safety matrix items in the database.
   */
  static listAllMatrixItems() {
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM herbal_drug_matrix`);
    return stmt.all();
  }
}
