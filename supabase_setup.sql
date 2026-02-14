-- SQL function to execute dynamic queries for the call dashboard
-- Run this in your Supabase SQL Editor

-- Create the execute_sql function
CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  cleaned_query text;
BEGIN
  -- Remove trailing semicolons and whitespace
  cleaned_query := regexp_replace(trim(query), ';+\s*$', '');
  
  -- Execute the query and return results as JSON
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', cleaned_query) INTO result;
  
  -- If no results, return empty array
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to the anon role (used by the API)
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO authenticated;

-- Optional: Add a comment to document the function
COMMENT ON FUNCTION public.execute_sql(text) IS 
  'Executes dynamic SQL queries for the call dashboard analytics. Only SELECT queries should be passed to this function.';

