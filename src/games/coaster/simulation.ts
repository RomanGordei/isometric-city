import { CoasterGameState } from './types';
import { syncCoasterTrains, updateCoasterTrains } from '@/components/coaster/coasterTrainSystem';
import { updateGuests } from '@/components/coaster/guestSystem';
import { updateStaff } from '@/components/coaster/staffSystem';

const HOURS_PER_SECOND = 0.04;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;

export function simulateCoasterTick(
  state: CoasterGameState,
  deltaSeconds: number
): CoasterGameState {
  if (state.speed === 0) {
    return state;
  }

  let hour = state.hour + deltaSeconds * HOURS_PER_SECOND;
  let day = state.day;
  let month = state.month;
  let year = state.year;
  let finance = { ...state.finance };

  while (hour >= 24) {
    hour -= 24;
    day += 1;
  }

  while (day > DAYS_PER_MONTH) {
    day -= DAYS_PER_MONTH;
    month += 1;
  }

  while (month > MONTHS_PER_YEAR) {
    month -= MONTHS_PER_YEAR;
    year += 1;
  }

  const dayChanged = day !== state.day;
  if (dayChanged) {
    const staffCosts = state.staff.length * 120;
    const rideCosts = state.rides.length * 25;
    finance.dailyExpenses = staffCosts + rideCosts;
    finance.money = Math.max(0, finance.money - finance.dailyExpenses);
    finance.dailyIncome = 0;
  }

  const timeUpdated = {
    ...state,
    hour,
    day,
    month,
    year,
    tick: state.tick + 1,
    finance,
  };

  const synced = syncCoasterTrains(timeUpdated);
  const trainsUpdated = updateCoasterTrains(synced, deltaSeconds);
  const guestsUpdated = updateGuests(trainsUpdated, deltaSeconds);
  const staffUpdated = updateStaff(guestsUpdated, deltaSeconds);

  const avgHappiness =
    staffUpdated.guests.length > 0
      ? staffUpdated.guests.reduce((sum, guest) => sum + guest.needs.happiness, 0) / staffUpdated.guests.length
      : 75;
  const rideVariety = Math.min(1, staffUpdated.rides.length / 8);
  const rating = Math.round(Math.min(100, Math.max(10, avgHappiness * 0.65 + rideVariety * 35)));

  return {
    ...staffUpdated,
    parkRating: rating,
  };
}
