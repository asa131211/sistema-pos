-- Este archivo contiene las instrucciones para configurar Firebase
-- No es un archivo SQL ejecutable, sino una guía de configuración

-- 1. Crear proyecto en Firebase Console
-- 2. Habilitar Authentication con Email/Password
-- 3. Crear Firestore Database
-- 4. Configurar Storage para imágenes
-- 5. Configurar reglas de seguridad

-- Reglas de Firestore:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Productos - solo admins pueden escribir, todos pueden leer
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Ventas - todos los usuarios autenticados pueden leer/escribir
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
  }
}
*/

-- Reglas de Storage:
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
  }
}
*/
