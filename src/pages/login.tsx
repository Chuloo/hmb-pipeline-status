import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase/component";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
      setLoading(false);
    };

    checkUser();
  }, [router, supabase.auth]);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to HMB Content Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your content dashboard
          </p>
        </div>
        <Button onClick={signInWithGoogle} variant="outline">
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
