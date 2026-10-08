// SEEDER
// Sistema de Gestión Documental

const DB_NAME = "gestion_documental";
const db = db.getSiblingDB(DB_NAME);

print(
  `Iniciando la carga de datos iniciales en la base de datos '${DB_NAME}'...`,
);

// Limpieza de datos existentes en las colecciones
db.users.deleteMany({});
db.folders.deleteMany({});
db.files.deleteMany({});
db.activity_logs.deleteMany({});
db.password_reset_codes.deleteMany({});

// CREACIÓN DE USUARIOS (Mínimo 3: 1 Admin, 2 Usuarios estándar)
const u1Id = new ObjectId("650000000000000000000001");
const u2Id = new ObjectId("650000000000000000000002");
const u3Id = new ObjectId("650000000000000000000003");

const usersData = [
  {
    _id: u1Id,
    name: "Juan",
    lastName: "Pérez",
    email: "admin@organizacion.com",
    // Contraseña de prueba: 'admin123' (simulado hash bcrypt)
    password: "$2a$12$Rr/AFmXG3bRa1peDoh5jZOlYWVQdMwL9BO6d0qOW196sSclL7PUhu",
    role: "admin",
    status: "activo",
    storageLimitBytes: 1073741824, // 1 GB
    createdAt: new Date("2026-01-10T08:00:00Z"),
    updatedAt: new Date("2026-01-10T08:00:00Z"),
  },
  {
    _id: u2Id,
    name: "Carlos",
    lastName: "Mendoza",
    email: "cmendoza@organizacion.com",
    // Contraseña de prueba: 'user123' (simulado hash bcrypt)
    password: "$2a$12$.8qIUO2T0bAB9RjOUClvxen0oYPPKv1xayhKbJh0MeOFWYWi1XM8O",
    role: "usuario",
    status: "activo",
    storageLimitBytes: 524288000, // 500 MB
    createdAt: new Date("2026-01-15T09:30:00Z"),
    updatedAt: new Date("2026-01-15T09:30:00Z"),
  },
  {
    _id: u3Id,
    name: "Ana",
    lastName: "Morales",
    email: "amorales@organizacion.com",
    // Contraseña de prueba: 'user123' (simulado hash bcrypt)
    password: "$2a$12$.8qIUO2T0bAB9RjOUClvxen0oYPPKv1xayhKbJh0MeOFWYWi1XM8O",
    role: "usuario",
    status: "activo",
    storageLimitBytes: 524288000, // 500 MB
    createdAt: new Date("2026-02-01T10:00:00Z"),
    updatedAt: new Date("2026-02-01T10:00:00Z"),
  },
];

db.users.insertMany(usersData);
print("Usuarios cargados exitosamente (3 usuarios).");

// ESTRUCTURA DE CARPETAS Y SUBCARPETAS (Con compartición y papelera)
const fAdminRoot = new ObjectId("651000000000000000000001");
const fAdminSub1 = new ObjectId("651000000000000000000002");
const fCarlosRoot = new ObjectId("651000000000000000000003");
const fCarlosSub1 = new ObjectId("651000000000000000000004");
const fCarlosTrash = new ObjectId("651000000000000000000005");
const fAnaRoot = new ObjectId("651000000000000000000006");
const fAnaSub1 = new ObjectId("651000000000000000000007");

const foldersData = [
  // Carpetas Admin
  {
    _id: fAdminRoot,
    name: "Politicas y Normativas",
    ownerId: u1Id,
    parentId: null,
    path: "/Politicas y Normativas",
    ancestors: [],
    sharedWith: [
      { userId: u2Id, permission: "lectura" }, // Compartición 1
      { userId: u3Id, permission: "lectura" }, // Compartición 2
    ],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-01-11T09:00:00Z"),
    updatedAt: new Date("2026-01-11T09:00:00Z"),
  },
  {
    _id: fAdminSub1,
    name: "Auditorias 2026",
    ownerId: u1Id,
    parentId: fAdminRoot,
    path: "/Politicas y Normativas/Auditorias 2026",
    ancestors: [fAdminRoot],
    sharedWith: [
      { userId: u3Id, permission: "edicion" }, // Compartición 3
    ],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-01-12T10:00:00Z"),
    updatedAt: new Date("2026-01-12T10:00:00Z"),
  },

  // Carpetas Carlos
  {
    _id: fCarlosRoot,
    name: "Contratos Legales",
    ownerId: u2Id,
    parentId: null,
    path: "/Contratos Legales",
    ancestors: [],
    sharedWith: [],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-01-16T11:00:00Z"),
    updatedAt: new Date("2026-01-16T11:00:00Z"),
  },
  {
    _id: fCarlosSub1,
    name: "Contratos de Servicios",
    ownerId: u2Id,
    parentId: fCarlosRoot,
    path: "/Contratos Legales/Contratos de Servicios",
    ancestors: [fCarlosRoot],
    sharedWith: [
      { userId: u3Id, permission: "comentar" }, // Compartición 4
    ],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-01-18T12:00:00Z"),
    updatedAt: new Date("2026-01-18T12:00:00Z"),
  },
  {
    _id: fCarlosTrash,
    name: "Borradores Obsoletos",
    ownerId: u2Id,
    parentId: null,
    path: "/Borradores Obsoletos",
    ancestors: [],
    sharedWith: [],
    isTrash: true, // Carpeta en papelera
    trashedAt: new Date("2026-02-15T16:00:00Z"),
    createdAt: new Date("2026-01-20T14:00:00Z"),
    updatedAt: new Date("2026-02-15T16:00:00Z"),
  },

  // Carpetas Ana
  {
    _id: fAnaRoot,
    name: "Reportes Financieros",
    ownerId: u3Id,
    parentId: null,
    path: "/Reportes Financieros",
    ancestors: [],
    sharedWith: [
      { userId: u1Id, permission: "lectura" }, // Compartición 5
    ],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-02-02T08:30:00Z"),
    updatedAt: new Date("2026-02-02T08:30:00Z"),
  },
  {
    _id: fAnaSub1,
    name: "Presupuestos Q1-Q2",
    ownerId: u3Id,
    parentId: fAnaRoot,
    path: "/Reportes Financieros/Presupuestos Q1-Q2",
    ancestors: [fAnaRoot],
    sharedWith: [
      { userId: u2Id, permission: "lectura" }, // Compartición 6
    ],
    isTrash: false,
    trashedAt: null,
    createdAt: new Date("2026-02-05T09:00:00Z"),
    updatedAt: new Date("2026-02-05T09:00:00Z"),
  },
];

db.folders.insertMany(foldersData);
print("Estructura de carpetas insertada exitosamente.");

// CREACIÓN DE 50 ARCHIVOS (.txt y .md)
// Distribuidos entre usuarios, carpetas, papelera y con comparticiones
const filesData = [];

// Lista base para generar 50 archivos con contenido real
for (let i = 1; i <= 50; i++) {
  const fileId = new ObjectId(
    `6520000000000000000000${i.toString().padStart(2, "0")}`,
  );
  const isMd = i % 2 === 0;
  const ext = isMd ? "md" : "txt";

  // Asignación de propietarios balanceada
  let owner = u1Id;
  let folder = fAdminRoot;
  if (i > 15 && i <= 35) {
    owner = u2Id;
    folder = i % 3 === 0 ? fCarlosSub1 : fCarlosRoot;
  } else if (i > 35) {
    owner = u3Id;
    folder = i % 2 === 0 ? fAnaSub1 : fAnaRoot;
  } else if (i <= 5) {
    folder = null; // En la raíz sin carpeta
  } else if (i <= 10) {
    folder = fAdminSub1;
  }

  // 3 archivos en papelera para probar la funcionalidad
  const isTrash = i === 12 || i === 28 || i === 48;
  const trashedAt = isTrash ? new Date("2026-02-25T10:00:00Z") : null;

  // Comparticiones en archivos (completando las 20 requeridas)
  const sharedWith = [];
  if (i === 1) sharedWith.push({ userId: u2Id, permission: "lectura" }); // Compartición 7
  if (i === 2) sharedWith.push({ userId: u3Id, permission: "edicion" }); // Compartición 8
  if (i === 3) {
    // Archivo top para el reporte de "más compartido"
    sharedWith.push({ userId: u2Id, permission: "lectura" }); // Compartición 9
    sharedWith.push({ userId: u3Id, permission: "comentar" }); // Compartición 10
  }
  if (i === 16) sharedWith.push({ userId: u1Id, permission: "lectura" }); // Compartición 11
  if (i === 17) sharedWith.push({ userId: u3Id, permission: "edicion" }); // Compartición 12
  if (i === 18) sharedWith.push({ userId: u1Id, permission: "comentar" }); // Compartición 13
  if (i === 19) {
    sharedWith.push({ userId: u1Id, permission: "lectura" }); // Compartición 14
    sharedWith.push({ userId: u3Id, permission: "edicion" }); // Compartición 15
  }
  if (i === 36) sharedWith.push({ userId: u1Id, permission: "lectura" }); // Compartición 16
  if (i === 37) sharedWith.push({ userId: u2Id, permission: "edicion" }); // Compartición 17
  if (i === 38) sharedWith.push({ userId: u2Id, permission: "comentar" }); // Compartición 18
  if (i === 39) sharedWith.push({ userId: u1Id, permission: "edicion" }); // Compartición 19
  if (i === 40) sharedWith.push({ userId: u2Id, permission: "lectura" }); // Compartición 20
  if (i === 41) sharedWith.push({ userId: u1Id, permission: "comentar" }); // Compartición 21

  const contentText = isMd
    ? `# Documento Técnico N° ${i}\n\nEste es un archivo Markdown generado para el sistema.\n\n- Punto 1\n- Punto 2\n\n**Estado:** Validado.`
    : `DOCUMENTO OFICIAL NRO. ${i}\n===============================\nContenido plano del archivo de texto.\nFecha de registro: 2026-02-${((i % 25) + 1).toString().padStart(2, "0")}\nOrganización de Servicios Profesionales.`;

  const day = (i % 26) + 1;
  const createdDate = new Date(
    `2026-02-${day.toString().padStart(2, "0")}T10:00:00Z`,
  );

  filesData.push({
    _id: fileId,
    name: `doc_organizacional_${i}.${ext}`,
    extension: ext,
    sizeBytes: 1024 * (i + 2),
    content: contentText,
    folderId: folder,
    ownerId: owner,
    sharedWith: sharedWith,
    tags: [
      isMd ? "markdown" : "texto",
      "organizacional",
      `lote_${Math.ceil(i / 10)}`,
    ],
    isTrash: isTrash,
    trashedAt: trashedAt,
    createdAt: createdDate,
    updatedAt: createdDate,
  });
}

db.files.insertMany(filesData);
print("50 archivos creados con su contenido almacenado en MongoDB.");

// HISTORIAL DE ACTIVIDAD (activity_logs)
// Demostrando todas las operaciones para los reportes de actividad
const activityLogsData = [
  // Creación de archivos y carpetas
  {
    userId: u1Id,
    action: "crear",
    resourceType: "carpeta",
    resourceId: fAdminRoot,
    details: { name: "Politicas y Normativas" },
    timestamp: new Date("2026-01-11T09:00:00Z"),
  },
  {
    userId: u2Id,
    action: "crear",
    resourceType: "carpeta",
    resourceId: fCarlosRoot,
    details: { name: "Contratos Legales" },
    timestamp: new Date("2026-01-16T11:00:00Z"),
  },
  {
    userId: u3Id,
    action: "crear",
    resourceType: "carpeta",
    resourceId: fAnaRoot,
    details: { name: "Reportes Financieros" },
    timestamp: new Date("2026-02-02T08:30:00Z"),
  },

  // Actividades sobre el archivo doc_organizacional_03 (archivo con más operaciones para el reporte)
  {
    userId: u1Id,
    action: "crear",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000003"),
    details: { name: "doc_organizacional_3.txt" },
    timestamp: new Date("2026-02-04T10:00:00Z"),
  },
  {
    userId: u1Id,
    action: "compartir",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000003"),
    details: { sharedTo: u2Id, permission: "lectura" },
    timestamp: new Date("2026-02-04T11:00:00Z"),
  },
  {
    userId: u1Id,
    action: "compartir",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000003"),
    details: { sharedTo: u3Id, permission: "comentar" },
    timestamp: new Date("2026-02-04T11:05:00Z"),
  },
  {
    userId: u2Id,
    action: "descargar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000003"),
    details: { name: "doc_organizacional_3.txt" },
    timestamp: new Date("2026-02-05T09:15:00Z"),
  },
  {
    userId: u1Id,
    action: "modificar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000003"),
    details: {
      field: "content",
      comment: "Actualización de cláusula de confidencialidad",
    },
    timestamp: new Date("2026-02-06T15:20:00Z"),
  },

  // Modificación y movimiento
  {
    userId: u2Id,
    action: "mover",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000020"),
    details: { fromFolderId: fCarlosRoot, toFolderId: fCarlosSub1 },
    timestamp: new Date("2026-02-18T10:30:00Z"),
  },
  {
    userId: u3Id,
    action: "modificar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000036"),
    details: {
      field: "name",
      oldName: "doc_viejo.md",
      newName: "doc_organizacional_36.md",
    },
    timestamp: new Date("2026-02-20T11:00:00Z"),
  },

  // Eliminación a papelera y restauración
  {
    userId: u2Id,
    action: "eliminar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000028"),
    details: { moveToTrash: true },
    timestamp: new Date("2026-02-25T10:00:00Z"),
  },
  {
    userId: u1Id,
    action: "eliminar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000012"),
    details: { moveToTrash: true },
    timestamp: new Date("2026-02-25T10:15:00Z"),
  },
  {
    userId: u3Id,
    action: "restaurar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000045"),
    details: { restoredFromTrash: true },
    timestamp: new Date("2026-02-26T08:45:00Z"),
  },
  {
    userId: u3Id,
    action: "descargar",
    resourceType: "archivo",
    resourceId: new ObjectId("652000000000000000000039"),
    details: { name: "doc_organizacional_39.txt" },
    timestamp: new Date("2026-02-27T14:10:00Z"),
  },
];

db.activity_logs.insertMany(activityLogsData);
print("Historial de auditoría cargado exitosamente.");

// RESUMEN DE LA CARGA
print("\n================ RESUMEN DE LA CARGA ================");
print(`- Usuarios registrados:       ${db.users.countDocuments()}`);
print(`- Carpetas creadas:          ${db.folders.countDocuments()}`);
print(
  `- Carpetas en papelera:      ${db.folders.countDocuments({ isTrash: true })}`,
);
print(`- Total archivos creados:     ${db.files.countDocuments()}`);
print(
  `  * Archivos .txt:           ${db.files.countDocuments({ extension: "txt" })}`,
);
print(
  `  * Archivos .md:            ${db.files.countDocuments({ extension: "md" })}`,
);
print(
  `  * Archivos en papelera:    ${db.files.countDocuments({ isTrash: true })}`,
);
print(`- Registros de actividad:     ${db.activity_logs.countDocuments()}`);
print("=====================================================");
print("¡Carga inicial completada con éxito!");
