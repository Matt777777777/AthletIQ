-- Script pour vérifier et corriger les politiques RLS
-- À exécuter dans l'éditeur SQL de Supabase

-- Vérifier si les politiques existent
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Si les politiques n'existent pas, les recréer
-- Désactiver RLS temporairement pour recréer les politiques
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_intake DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Recréer les politiques pour profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour saved_plans
CREATE POLICY "Users can view own saved plans" ON saved_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved plans" ON saved_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved plans" ON saved_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved plans" ON saved_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour shopping_items
CREATE POLICY "Users can view own shopping items" ON shopping_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping items" ON shopping_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping items" ON shopping_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping items" ON shopping_items
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour daily_intake
CREATE POLICY "Users can view own daily intake" ON daily_intake
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily intake" ON daily_intake
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily intake" ON daily_intake
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily intake" ON daily_intake
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour daily_steps
CREATE POLICY "Users can view own daily steps" ON daily_steps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily steps" ON daily_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily steps" ON daily_steps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily steps" ON daily_steps
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour day_plans
CREATE POLICY "Users can view own day plans" ON day_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day plans" ON day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day plans" ON day_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own day plans" ON day_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Recréer les politiques pour chat_messages
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Réactiver RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Vérifier que les politiques sont bien créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
