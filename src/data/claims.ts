export type Claim = {
  id: number;
  itemId: number;
  itemTitle: string;
  ownerEmail: string;
  claimantEmail: string;
  claimantName: string;
  lostDate: string;
  lostLocation: string;
  brandModel: string;
  distinctiveFeature: string;
  extraNote: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};