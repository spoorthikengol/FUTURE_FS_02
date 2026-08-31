import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "FOLLOW_UP_DUE",
        "FOLLOW_UP_OVERDUE",
        "LEAD_CREATED",
        "SYSTEM",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    link: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

NotificationSchema.index({
  userId: 1,
  read: 1,
  createdAt: -1,
});

export type NotificationDocument =
  mongoose.InferSchemaType<typeof NotificationSchema> & {
    _id: mongoose.Types.ObjectId;
  };

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<NotificationDocument>(
    "Notification",
    NotificationSchema,
  );