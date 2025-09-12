// migrate-to-supabase-only.js
// Script pour migrer tous les services vers Supabase uniquement

const fs = require('fs');
const path = require('path');

// Liste des fichiers à migrer
const filesToMigrate = [
  'lib/profile.ts',
  'lib/plans.ts',
  'lib/shopping.ts',
  'lib/nutrition.ts',
  'lib/steps.ts',
  'lib/dayplan.ts',
  'lib/chat.ts'
];

console.log('🚀 Migration vers Supabase uniquement - Phase 4');
console.log('===============================================');

filesToMigrate.forEach(filePath => {
  try {
    console.log(`\n📝 Migration de ${filePath}...`);
    
    // Lire le fichier
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Remplacer l'import du storage adapter
    const newContent = content
      .replace(
        /import { storageAdapter } from ['"]\.\/storage-adapter-simple['"];?/g,
        'import { supabaseStorageAdapter as storageAdapter } from \'./storage-adapter-supabase\';'
      )
      .replace(
        /from ['"]\.\/storage-adapter-simple['"]/g,
        'from \'./storage-adapter-supabase\''
      );
    
    // Écrire le fichier modifié
    fs.writeFileSync(filePath, newContent);
    
    console.log(`✅ ${filePath} migré avec succès`);
  } catch (error) {
    console.error(`❌ Erreur migration ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Migration terminée !');
console.log('✅ Tous les services utilisent maintenant Supabase uniquement');

