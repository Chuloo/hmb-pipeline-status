import { useEffect } from "react";
import { useRouter } from "next/router";
import { Loading } from "@/components/ui/loading";
import { createClient } from "@/lib/supabase/component";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          await router.push("/");
        } else {
          await router.push("/login");
        }
      } catch (error) {
        console.error("Error during auth callback:", error);
        await router.push("/login");
      }
    };

    handleCallback();
  }, [router, supabase.auth]);

  return <Loading />;
}
