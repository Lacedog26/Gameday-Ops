import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rrirjiqapmzdegckkvlf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Q_8vRzo8vsVcsb3Swup0Rw_EOK27M09";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
