import { model, Schema, Document, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface Post extends Document {
  title: string;
  content: string;
  published: boolean;
  user: Schema.Types.ObjectId;
  premium: boolean;
  paginate: any;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema<Post>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    published: { type: Boolean, required: true, default: false },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    premium: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

PostSchema.plugin(mongoosePaginate);

PostSchema.index({ "$**": "text" });

interface PostModel<T extends Document> extends PaginateModel<T> {}

export const PostModel: PaginateModel<Post> = model<Post>("Post", PostSchema) as PostModel<Post>;
