-- Este archivo contiene las reglas de Firestore para el sistema POS
-- Copiar estas reglas en la consola de Firebase

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para usuarios
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para productos
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'administrador' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions.hasAny(['all', 'products_write']));
    }
    
    // Reglas para ventas
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para caja registradora
    match /cash-registers/{registerId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para configuración
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'administrador';
    }
  }
}
