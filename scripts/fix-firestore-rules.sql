-- Reglas de Firestore actualizadas para solucionar permisos
-- Copia estas reglas en Firebase Console > Firestore Database > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Productos - todos pueden leer, solo admins escribir
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Ventas - todos los usuarios autenticados pueden leer/escribir
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
    
    // NUEVO: Cajas registradoras - usuarios pueden gestionar sus propias cajas
    match /cash-registers/{registerId} {
      allow read, write: if request.auth != null && 
        resource.data.openedBy == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.openedBy == request.auth.uid;
    }
    
    // NUEVO: Movimientos de caja - usuarios pueden crear sus propios movimientos
    match /cash-movements/{movementId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
