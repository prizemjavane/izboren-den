import { calculateMandates } from './utils';

describe('calculateMandates', () => {
  const TOTAL_MANDATES = 240;

  it('should return all zeros when all votes are zero', () => {
    const votes = [0, 0, 0, 0];
    const result = calculateMandates(votes);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it('should return all zeros when no party passes the 4% threshold', () => {
    // 30 equal parties — each has ~3.3%, below 4%
    const votes = new Array(30).fill(1000);
    const result = calculateMandates(votes);
    expect(result).toEqual(new Array(30).fill(0));
  });

  it('should give all 240 mandates to a single party', () => {
    const votes = [1000000];
    const result = calculateMandates(votes);
    expect(result).toEqual([TOTAL_MANDATES]);
  });

  it('should distribute mandates proportionally when votes divide evenly', () => {
    // 50%, 30%, 20% — all above 4%
    const votes = [500000, 300000, 200000];
    const result = calculateMandates(votes);
    expect(result).toEqual([120, 72, 48]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
  });

  it('should always distribute exactly 240 mandates total', () => {
    const votes = [410000, 250000, 180000, 90000, 70000];
    const result = calculateMandates(votes);
    expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
  });

  it('should filter parties below 4% threshold', () => {
    // Party C has 3% — below threshold
    const votes = [600000, 370000, 30000];
    const result = calculateMandates(votes);
    expect(result[2]).toBe(0);
    expect(result[0] + result[1]).toBe(TOTAL_MANDATES);
  });

  it('should give remainder mandates to parties with largest remainders', () => {
    // Design votes so that remainder allocation matters
    // A: 60%, B: 25%, C: 15%  (total 1,000,000)
    // Quota = 1,000,000 / 240 ≈ 4166.67
    // A: floor(600,000 / 4166.67) = 143, remainder 600,000 - 143*4166.67 = 600,000 - 595,833.81 = 4166.19
    // B: floor(250,000 / 4166.67) = 59, remainder 250,000 - 59*4166.67 = 250,000 - 245,833.53 = 4166.47
    // C: floor(150,000 / 4166.67) = 35, remainder 150,000 - 35*4166.67 = 150,000 - 145,833.45 = 4166.55
    // Total initial: 237, remaining: 3 → all three get one each
    const votes = [600000, 250000, 150000];
    const result = calculateMandates(votes);
    expect(result).toEqual([144, 60, 36]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
  });

  it('should handle duplicate vote counts correctly', () => {
    // Two parties with identical votes — both should get mandates
    const votes = [500000, 250000, 250000];
    const result = calculateMandates(votes);
    expect(result[1]).toBeGreaterThan(0);
    expect(result[2]).toBeGreaterThan(0);
    // Symmetric votes should produce equal mandates
    expect(result[1]).toBe(result[2]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
  });

  it('should handle party exactly at 4% threshold', () => {
    // Party C at exactly 4% should qualify
    const total = 1000000;
    const partyC = total * 0.04; // exactly 4%
    const votes = [600000, 360000, partyC];
    const result = calculateMandates(votes);
    expect(result[2]).toBeGreaterThan(0);
    expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
  });

  it('should handle many small parties below threshold', () => {
    // 1 big party + many small ones each below 4% of total
    const votes = [800000, 10000, 8000, 6000, 4000, 3000, 2000, 1000];
    const result = calculateMandates(votes);
    expect(result[0]).toBe(TOTAL_MANDATES);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBe(0);
    }
  });

  // Реални данни от парламентарни избори — 27 октомври 2024
  // Източник: ЦИК / Wikipedia — October 2024 Bulgarian parliamentary election
  //
  // Забележка: Реалните мандати се разпределят по МИР (31 многомандатни избирателни района),
  // а не на национално ниво. При подаване само на класираните партии, резултатът съвпада
  // защото общият брой гласове = гласовете на класираните партии.
  describe('with real election data (October 2024)', () => {
    // Гласове на партиите, преминали 4% бариерата
    const votes = [
      642973, // ГЕРБ–СДС
      346063, // ПП–ДБ
      325466, // Възраждане
      281356, // ДПС – Ново начало
      184403, // БСП – Обединена левица
      182253, // Алианс за права и свободи
      165160, // Има такъв народ
      111965, // МЕЧ (Морал, Единство, Чест)
    ];

    const expectedMandates = [
      69, // ГЕРБ–СДС
      37, // ПП–ДБ
      35, // Възраждане
      30, // ДПС – Ново начало
      20, // БСП – Обединена левица
      19, // Алианс за права и свободи
      18, // Има такъв народ
      12, // МЕЧ
    ];

    it('should match the official mandate distribution', () => {
      const result = calculateMandates(votes);
      expect(result).toEqual(expectedMandates);
    });

    it('should distribute all 240 mandates', () => {
      const result = calculateMandates(votes);
      expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
    });

    it('should filter a below-threshold party without affecting qualifying parties', () => {
      // Добавяме малка партия с гласове под 4% от новия общ брой
      // 4% от (2,239,639 + 80,000) = 92,785 > 80,000 → не преминава бариерата
      const votesWithSmallParty = [...votes, 80000];
      const result = calculateMandates(votesWithSmallParty);

      // Малката партия не получава мандати
      expect(result[8]).toBe(0);
      // Общо мандати = 240
      expect(result.reduce((a, b) => a + b, 0)).toBe(TOTAL_MANDATES);
    });
  });
});
