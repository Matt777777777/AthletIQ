-- Configuration Supabase pour l'authentification TheSport

-- 1. Désactiver temporairement RLS pour les tests
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Ou créer des politiques RLS permissives
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own profile" ON profiles
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete own profile" ON profiles
--   FOR DELETE USING (auth.uid() = user_id);

-- 3. Appliquer les mêmes politiques aux autres tables
ALTER TABLE saved_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_intake DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- 4. Vérifier les politiques existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'saved_plans', 'shopping_items', 'daily_intake', 'daily_steps', 'day_plans', 'chat_messages');

