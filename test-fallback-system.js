// Test du système de fallback
const { storageAdapter } = require('./lib/storage-adapter');

async function testFallbackSystem() {
  console.log('🔍 Test du système de fallback...');
  
  try {
    // Test 1: Initialisation
    console.log('1️⃣ Initialisation du storage adapter...');
    await storageAdapter.initialize();
    console.log('✅ Mode de stockage:', storageAdapter.getMode());
    
    // Test 2: Sauvegarde de test
    console.log('2️⃣ Test de sauvegarde...');
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Test de migration Supabase'
    };
    
    await storageAdapter.save('test_migration', testData);
    console.log('✅ Données de test sauvegardées');
    
    // Test 3: Chargement de test
    console.log('3️⃣ Test de chargement...');
    const loadedData = await storageAdapter.load('test_migration');
    console.log('✅ Données chargées:', loadedData);
    
    // Test 4: Vérification de cohérence
    if (loadedData && loadedData.test === testData.test) {
      console.log('✅ Données cohérentes - Migration fonctionne !');
    } else {
      console.log('❌ Données incohérentes - Problème de migration');
    }
    
    // Test 5: Nettoyage
    console.log('4️⃣ Nettoyage...');
    await storageAdapter.remove('test_migration');
    console.log('✅ Test terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testFallbackSystem();

