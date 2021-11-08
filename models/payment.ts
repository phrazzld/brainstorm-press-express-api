import { model, Schema } from "mongoose";

export interface Payment {
  reader: Schema.Types.ObjectId;
  author: Schema.Types.ObjectId;
}

const PaymentSchema = new Schema<Payment>({
  reader: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export const PaymentModel = model("Payment", PaymentSchema);
