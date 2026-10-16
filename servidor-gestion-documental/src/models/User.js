const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Esquema de Usuario para el Sistema de Gestión Documental
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre completo es obligatorio"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder los 100 caracteres"],
    },
    lastName: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true,
      maxlength: [100, "El apellido no puede exceder los 100 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Por favor ingrese un correo electrónico válido",
      ],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
      select: false, // Evita enviar la contraseña en consultas por defecto
    },
    role: {
      type: String,
      enum: {
        values: ["admin", "usuario"],
        message: "El rol debe ser admin o usuario",
      },
      default: "usuario",
    },
    status: {
      type: String,
      enum: {
        values: ["activo", "inactivo"],
        message: "El estado debe ser activo o inactivo",
      },
      default: "activo",
    },
    storageLimitBytes: {
      type: Number,
      default: 524288000, // 500 MB por defecto
    },
  },
  {
    timestamps: true, // Genera automáticamente createdAt y updatedAt
  },
);

/**
 * Hook pre-save: Hashea la contraseña antes de guardarla en la base de datos
 * Solo se ejecuta si el campo 'password' ha sido creado o modificado.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Método de instancia para verificar si una contraseña ingresada coincide con el hash guardado
 * @param {string} candidatePassword - Contraseña en texto plano a verificar
 * @returns {Promise<boolean>}
 */
userSchema.methods.compararPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Sobrescritura de toJSON para garantizar que campos sensibles nunca se transmitan al cliente
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
