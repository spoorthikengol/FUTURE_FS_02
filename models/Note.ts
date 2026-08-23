import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    content: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

NoteSchema.index({ leadId: 1, createdAt: -1 });

export type NoteDocument = mongoose.InferSchemaType<typeof NoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Note =
  mongoose.models.Note || mongoose.model<NoteDocument>("Note", NoteSchema);
