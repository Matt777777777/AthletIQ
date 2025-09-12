-- Schema Supabase pour TheSport
-- Ce fichier contient toutes les tables nécessaires pour la migration

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des profils utilisateur
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 2,
  diet TEXT NOT NULL,
  first_name TEXT,
  age INTEGER,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  gender TEXT CHECK (gender IN ('male', 'female')),
  profile_photo TEXT,
  fitness_level TEXT,
  equipment TEXT,
  intolerances TEXT,
  limitations TEXT,
  preferred_time TEXT,
  chat_responses JSONB,
  chat_questions_asked BOOLEAN DEFAULT FALSE,
  daily_meals JSONB,
  daily_workout JSONB,
  saved_plans JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table des plans sauvegardés
CREATE TABLE IF NOT EXISTS saved_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workout', 'meal')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des items de course
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de l'apport quotidien
CREATE TABLE IF NOT EXISTS daily_intake (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kcal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table des pas quotidiens
CREATE TABLE IF NOT EXISTS daily_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table des plans journaliers
CREATE TABLE IF NOT EXISTS day_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  breakfast JSONB,
  lunch JSONB,
  snack JSONB,
  dinner JSONB,
  workout JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Table des messages de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  original_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user_id ON saved_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plans_type ON saved_plans(type);
CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_checked ON shopping_items(checked);
CREATE INDEX IF NOT EXISTS idx_daily_intake_user_id ON daily_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_intake_date ON daily_intake(date);
CREATE INDEX IF NOT EXISTS idx_daily_steps_user_id ON daily_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_steps_date ON daily_steps(date);
CREATE INDEX IF NOT EXISTS idx_day_plans_user_id ON day_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_date ON day_plans(date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Politiques pour profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour saved_plans
CREATE POLICY "Users can view own saved plans" ON saved_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved plans" ON saved_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved plans" ON saved_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved plans" ON saved_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour shopping_items
CREATE POLICY "Users can view own shopping items" ON shopping_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping items" ON shopping_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping items" ON shopping_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping items" ON shopping_items
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour daily_intake
CREATE POLICY "Users can view own daily intake" ON daily_intake
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily intake" ON daily_intake
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily intake" ON daily_intake
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily intake" ON daily_intake
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour daily_steps
CREATE POLICY "Users can view own daily steps" ON daily_steps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily steps" ON daily_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily steps" ON daily_steps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily steps" ON daily_steps
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour day_plans
CREATE POLICY "Users can view own day plans" ON day_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day plans" ON day_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day plans" ON day_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own day plans" ON day_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour chat_messages
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

