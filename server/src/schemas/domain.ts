import { z } from "zod";

export const StatusSchema = z.enum(["draft", "ready"]);

const longText = z.string().max(20_000);

export const FlightSchema = z.object({
  route: longText,
  airline: longText,
  flightNo: longText,
  depAirport: longText,
  depTerminal: longText,
  depDate: longText,
  depTime: longText,
  arrAirport: longText,
  arrTerminal: longText,
  arrDate: longText,
  arrTime: longText,
  duration: longText,
  baggage: longText,
});

export const SupRowSchema = z.object({
  id: z.string().max(64),
  desc: longText,
  amount: longText,
  chargeType: longText,
});

export const CanRowSchema = z.object({
  id: z.string().max(64),
  rule: longText,
  charge: longText,
});

export const FormDataSchema = z.object({
  agencyName: longText,
  agencyTagline: longText,
  agencyFooter: longText,
  page1Heading: longText,
  outbound: FlightSchema,
  returnFlight: FlightSchema,
  hotelName: longText,
  hotelAddress: longText,
  hotelPhone: longText,
  checkIn: longText,
  checkOut: longText,
  roomDesc: longText,
  inclusions: longText,
  supplements: z.array(SupRowSchema).max(50),
  cancellationRows: z.array(CanRowSchema).max(50),
  noShow: longText,
  ratesConditions: longText,
  contactName: longText,
  contactPhone: longText,
  contactEmail: longText,
  honorific: longText,
  firstName: longText,
  lastName: longText,
  passengerType: longText,
  birthdate: longText,
  nationality: longText,
  passportNo: longText,
  passportExpiry: longText,
  issuingCountry: longText,
  dateIssued: longText,
  adultBaseFare: longText,
  adultOtherCharges: longText,
  adultTotalFare: longText,
  roomRate: longText,
  roomTaxes: longText,
  totalRoomRate: longText,
  originalTotal: longText,
  savings: longText,
  totalDue: longText,
  internalNotes: longText,
});

export type FormDataValidated = z.infer<typeof FormDataSchema>;

const itineraryLine = () => z.string().max(4000).default("");

/** Body for POST /v1/itineraries — server assigns `id`. */
export const CreateItinerarySchema = z.object({
  title: itineraryLine(),
  client: itineraryLine(),
  destination: itineraryLine(),
  travelStart: itineraryLine(),
  travelEnd: itineraryLine(),
  status: StatusSchema.default("draft"),
  form: FormDataSchema,
});

export const PatchItinerarySchema = z
  .object({
    title: z.string().max(4000).optional(),
    client: z.string().max(4000).optional(),
    destination: z.string().max(4000).optional(),
    travelStart: z.string().max(4000).optional(),
    travelEnd: z.string().max(4000).optional(),
    status: StatusSchema.optional(),
    form: FormDataSchema.optional(),
  })
  .strict();

export const QueryListSchema = z.object({
  status: z.enum(["all", "draft", "ready"]).optional().default("all"),
  q: z.string().max(400).optional(),
});
