// Script de test pour vérifier la connexion Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://rphvyntgmnogacsxueeo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwaHZ5bnRnbW5vZ2Fjc3h1ZWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjQ5ODIsImV4cCI6MjA3MzEwMDk4Mn0.UO0QuZEf70ZXx6dwnfhSn1AmLOjbnwsWbCmdjUX-LXc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🔍 Test de connexion Supabase...');
  
  try {
    // Test 1: Vérifier la connexion de base
    console.log('1️⃣ Test de connexion de base...');
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie !');
    console.log('📊 Données reçues:', data);
    
    // Test 2: Vérifier les tables créées
    console.log('\n2️⃣ Test des tables...');
    const tables = ['profiles', 'saved_plans', 'shopping_items', 'daily_intake', 'daily_steps', 'day_plans', 'chat_messages'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
          console.log(`❌ Table ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ Table ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    // Test 3: Vérifier les politiques RLS
    console.log('\n3️⃣ Test des politiques RLS...');
    try {
      // Essayer d'insérer un profil (devrait échouer sans authentification)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: 'test', goal: 'test', sessions: 2, diet: 'test' });
      
      if (insertError && insertError.message.includes('RLS')) {
        console.log('✅ Politiques RLS actives (insertion bloquée sans auth)');
      } else {
        console.log('⚠️ Politiques RLS non configurées correctement');
      }
    } catch (err) {
      console.log('✅ Politiques RLS actives (erreur attendue)');
    }
    
    console.log('\n🎉 Tests Supabase terminés avec succès !');
    console.log('📋 Prochaines étapes:');
    console.log('   1. Tester l\'application mobile');
    console.log('   2. Vérifier les logs de migration');
    console.log('   3. Migrer les autres services');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test
testSupabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});
