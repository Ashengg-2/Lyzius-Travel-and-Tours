export type Status = "draft" | "ready";

export interface Flight {
  route: string;
  airline: string;
  flightNo: string;
  depAirport: string;
  depTerminal: string;
  depDate: string;
  depTime: string;
  arrAirport: string;
  arrTerminal: string;
  arrDate: string;
  arrTime: string;
  duration: string;
  baggage: string;
}

export interface SupRow {
  id: string;
  desc: string;
  amount: string;
  chargeType: string;
}

export interface CanRow {
  id: string;
  rule: string;
  charge: string;
}

export interface Passenger {
  id: string;
  honorific: string;
  firstName: string;
  lastName: string;
  passengerType: string;
  birthdate: string;
  nationality: string;
  passportNo: string;
  passportExpiry: string;
  issuingCountry: string;
  dateIssued: string;
}

export interface FormData {
  agencyName: string;
  agencyTagline: string;
  agencyFooter: string;
  page1Heading: string;
  outbound: Flight;
  returnFlight: Flight;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  checkIn: string;
  checkOut: string;
  roomDesc: string;
  inclusions: string;
  supplements: SupRow[];
  cancellationRows: CanRow[];
  noShow: string;
  ratesConditions: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  passengers: Passenger[];
  adultBaseFare: string;
  adultOtherCharges: string;
  adultTotalFare: string;
  roomRate: string;
  roomTaxes: string;
  totalRoomRate: string;
  originalTotal: string;
  savings: string;
  totalDue: string;
  internalNotes: string;
  /** When true, itinerary PDF omits fare amounts (editor still shows computed totals). */
  hidePricingOnPdf: boolean;
}

export interface Itinerary {
  id: string;
  title: string;
  client: string;
  destination: string;
  travelStart: string;
  travelEnd: string;
  status: Status;
  lastUpdated: string;
  form: FormData;
}
