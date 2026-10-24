const mongoose = require("mongoose");

/**
 * Esquema para la colección de auditoría: activity_logs
 * Cumple estrictamente con el validador JSON Schema definido en database/init-db.js
 */
const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario es obligatorio"],
    },
    action: {
      type: String,
      enum: [
        "crear",
        "modificar",
        "mover",
        "eliminar",
        "restaurar",
        "compartir",
        "descargar",
      ],
      required: [true, "El tipo de operación/acción es obligatorio"],
    },
    resourceType: {
      type: String,
      enum: ["archivo", "carpeta"],
      required: [true, "El tipo de recurso (archivo/carpeta) es obligatorio"],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "El ID del recurso afectado es obligatorio"],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, "La fecha y hora del evento es obligatoria"],
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    collection: "activity_logs",
    timestamps: false,
    versionKey: false,
  },
);

// Índices para optimizar consultas de auditoría y reportes
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ resourceType: 1 });
activityLogSchema.index({ resourceId: 1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
