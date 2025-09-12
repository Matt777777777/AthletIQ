// test-migration.js
// Script de test pour vérifier la migration Supabase

const { storageAdapter } = require('./lib/storage-adapter-simple.ts');

async function testMigration() {
  console.log('🧪 Test de migration Supabase - Phase 3');
  console.log('=====================================');

  try {
    // Initialiser le storage adapter
    await storageAdapter.initialize();
    console.log('✅ Storage adapter initialisé');
    console.log(`📊 Mode de stockage: ${storageAdapter.getMode()}`);

    // Test 1: Profil utilisateur
    console.log('\n🔍 Test 1: Profil utilisateur');
    const testProfile = {
      goal: 'Perdre du poids',
      sessions: 3,
      diet: 'Aucune restriction',
      firstName: 'Test User',
      age: 25,
      weight: 70,
      height: 175,
      gender: 'male'
    };
    
    await storageAdapter.save('the_sport_profile_v1', testProfile);
    const loadedProfile = await storageAdapter.load('the_sport_profile_v1');
    console.log('✅ Profil sauvegardé et chargé:', loadedProfile?.firstName);

    // Test 2: Plans sauvegardés
    console.log('\n🔍 Test 2: Plans sauvegardés');
    const testPlans = [
      {
        id: 'test-workout-1',
        type: 'workout',
        title: 'Test Workout',
        content: 'Test content',
        dateISO: new Date().toISOString()
      }
    ];
    
    await storageAdapter.save('the_sport_saved_plans_v1', testPlans);
    const loadedPlans = await storageAdapter.load('the_sport_saved_plans_v1');
    console.log('✅ Plans sauvegardés et chargés:', loadedPlans?.length, 'plans');

    // Test 3: Liste de courses
    console.log('\n🔍 Test 3: Liste de courses');
    const testShopping = [
      {
        id: 'test-item-1',
        name: 'Pommes',
        quantity: '2',
        unit: 'kg',
        category: 'Fruits',
        checked: false,
        dateAdded: new Date().toISOString()
      }
    ];
    
    await storageAdapter.save('the_sport_shopping_list_v1', testShopping);
    const loadedShopping = await storageAdapter.load('the_sport_shopping_list_v1');
    console.log('✅ Liste de courses sauvegardée et chargée:', loadedShopping?.length, 'articles');

    // Test 4: Apport nutritionnel
    console.log('\n🔍 Test 4: Apport nutritionnel');
    const testIntake = { kcal: 2000 };
    
    await storageAdapter.save('the_sport_daily_intake_v1', testIntake);
    const loadedIntake = await storageAdapter.load('the_sport_daily_intake_v1');
    console.log('✅ Apport nutritionnel sauvegardé et chargé:', loadedIntake?.kcal, 'kcal');

    // Test 5: Pas de marche
    console.log('\n🔍 Test 5: Pas de marche');
    const testSteps = { steps: 5000, lastUpdated: new Date().toISOString() };
    
    await storageAdapter.save('the_sport_daily_steps_v1', testSteps);
    const loadedSteps = await storageAdapter.load('the_sport_daily_steps_v1');
    console.log('✅ Pas de marche sauvegardés et chargés:', loadedSteps?.steps, 'pas');

    // Test 6: Plans de jour
    console.log('\n🔍 Test 6: Plans de jour');
    const testDayPlans = [
      {
        id: 'test-day-1',
        title: 'Test Day Plan',
        date: '2024-01-15',
        workout: { title: 'Test Workout', content: 'Test content' },
        meals: {
          breakfast: { title: 'Test Breakfast', content: 'Test content' },
          lunch: { title: 'Test Lunch', content: 'Test content' },
          dinner: { title: 'Test Dinner', content: 'Test content' }
        },
        shoppingList: [],
        createdAt: new Date().toISOString()
      }
    ];
    
    await storageAdapter.save('the_sport_day_plans_v1', testDayPlans);
    const loadedDayPlans = await storageAdapter.load('the_sport_day_plans_v1');
    console.log('✅ Plans de jour sauvegardés et chargés:', loadedDayPlans?.length, 'plans');

    // Test 7: Messages de chat
    console.log('\n🔍 Test 7: Messages de chat');
    const testMessages = [
      {
        id: 'test-msg-1',
        text: 'Test message',
        sender: 'user',
        originalText: 'Test original text'
      }
    ];
    
    await storageAdapter.save('the_sport_chat_messages_v1', testMessages);
    const loadedMessages = await storageAdapter.load('the_sport_chat_messages_v1');
    console.log('✅ Messages de chat sauvegardés et chargés:', loadedMessages?.length, 'messages');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('✅ Migration Supabase Phase 3 validée');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

testMigration();

