// SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS: Sistema de Gestión Documental

const DB_NAME = "gestion_documental";
const db = db.getSiblingDB(DB_NAME);

// 1. Limpieza inicial (opcional: recrear desde cero)
db.dropDatabase();
print(`Base de datos '${DB_NAME}' limpiada y lista para inicializar.`);

// CREACIÓN DE COLECCIONES CON VALIDACIÓN (JSON Schema)

// Colección: users
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name",
        "lastName",
        "email",
        "password",
        "role",
        "status",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        name: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        password: { bsonType: "string" },
        role: { enum: ["admin", "usuario"] },
        status: { enum: ["activo", "inactivo"] },
        storageLimitBytes: { bsonType: ["int", "long", "double"] },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
    },
  },
});

// Colección: folders
db.createCollection("folders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name",
        "ownerId",
        "parentId",
        "ancestors",
        "isTrash",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        name: { bsonType: "string" },
        ownerId: { bsonType: "objectId" },
        parentId: { bsonType: ["objectId", "null"] },
        path: { bsonType: "string" },
        ancestors: {
          bsonType: "array",
          items: { bsonType: "objectId" },
        },
        sharedWith: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["userId", "permission"],
            properties: {
              userId: { bsonType: "objectId" },
              permission: { enum: ["lectura", "edicion", "comentar"] },
            },
          },
        },
        isTrash: { bsonType: "bool" },
        trashedAt: { bsonType: ["date", "null"] },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
    },
  },
});

// Colección: files
db.createCollection("files", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "name",
        "extension",
        "sizeBytes",
        "content",
        "folderId",
        "ownerId",
        "isTrash",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        name: { bsonType: "string" },
        extension: { enum: ["txt", "md"] },
        sizeBytes: { bsonType: ["int", "long", "double"] },
        content: { bsonType: "string" },
        folderId: { bsonType: ["objectId", "null"] },
        ownerId: { bsonType: "objectId" },
        sharedWith: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["userId", "permission"],
            properties: {
              userId: { bsonType: "objectId" },
              permission: { enum: ["lectura", "edicion", "comentar"] },
            },
          },
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
        },
        isTrash: { bsonType: "bool" },
        trashedAt: { bsonType: ["date", "null"] },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
    },
  },
});

// Colección: activity_logs
db.createCollection("activity_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "action", "resourceType", "resourceId", "timestamp"],
      properties: {
        userId: { bsonType: "objectId" },
        action: {
          enum: [
            "crear",
            "modificar",
            "mover",
            "eliminar",
            "restaurar",
            "compartir",
            "descargar",
          ],
        },
        resourceType: { enum: ["archivo", "carpeta"] },
        resourceId: { bsonType: "objectId" },
        details: { bsonType: "object" },
        timestamp: { bsonType: "date" },
      },
    },
  },
});

// Colección: password_reset_codes
db.createCollection("password_reset_codes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "userId",
        "code",
        "used",
        "attempts",
        "createdAt",
        "expiresAt",
      ],
      properties: {
        userId: { bsonType: "objectId" },
        code: { bsonType: "string" },
        used: { bsonType: "bool" },
        attempts: { bsonType: ["int", "long", "double"] },
        createdAt: { bsonType: "date" },
        expiresAt: { bsonType: "date" },
      },
    },
  },
});

print("Colecciones y validaciones JSON Schema creadas con éxito.");

// CREACIÓN DE ÍNDICES

// Índices para users
db.users.createIndex({ email: 1 }, { unique: true });

// Índices para folders
db.folders.createIndex({ ownerId: 1, parentId: 1, isTrash: 1 });
db.folders.createIndex({ "sharedWith.userId": 1 });
db.folders.createIndex({ ancestors: 1 });

// Índices para files
db.files.createIndex({ ownerId: 1, folderId: 1, isTrash: 1 });
db.files.createIndex({ extension: 1 });
db.files.createIndex({ createdAt: 1 });
db.files.createIndex({ "sharedWith.userId": 1 });

// Índices para activity_logs
db.activity_logs.createIndex({ userId: 1, timestamp: -1 });
db.activity_logs.createIndex({ action: 1, timestamp: 1 });
db.activity_logs.createIndex({ resourceId: 1 });
db.activity_logs.createIndex({ timestamp: 1 });

// Índices para password_reset_codes
db.password_reset_codes.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
db.password_reset_codes.createIndex({ userId: 1, used: 1 });

print("Índices creados exitosamente.");
