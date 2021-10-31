import { model, Schema, Document, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface Post extends Document {
  title: string;
  content: string;
  price: number;
  published: boolean;
  user: Schema.Types.ObjectId;
  payments: Array<Schema.Types.ObjectId>;
  paginate: () => void;
}

const PostSchema: Schema = new Schema<Post>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  price: { type: Number, required: true },
  published: { type: Boolean, required: true, default: false },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  payments: [{ type: Schema.Types.ObjectId, ref: "PostPayment" }],
});

PostSchema.plugin(mongoosePaginate);

PostSchema.index({ "$**": "text" });

interface PostModel<T extends Document> extends PaginateModel<T> {}

export const PostModel: PostModel<Post> = model<Post>("Post", PostSchema);
