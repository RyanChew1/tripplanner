"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CustomLoader from "@/components/CustomLoader";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loaderComplete, setLoaderComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && user && loaderComplete) {
      router.push("/home");
    }
  }, [user, loading, router, loaderComplete]);

  // Show loader until both auth loading is done AND loader animation is complete
  if (loading || !loaderComplete) {
    return (
      <div className="min-h-screen bg-gray-300 bg-opacity-50 flex items-center justify-center">
        <div className="flex items-center space-x-12">
          <div className="text-center">
            <CustomLoader size={200} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-300 bg-opacity-50 flex-col">
        <h1 className="text-4xl font-bold text-gray-800">
          <p>
            Vacations are better{" "}
            <span className="text-blue-500 font-extrabold text-5xl animate-fadeInUp">
              Together
            </span>

          </p>
        </h1>
        <Button className="mt-4 py-8 px-5 font-bold text-lg bg-green_primary text-white hover:bg-green_primary/80"
        onClick={() => router.push("/signup?isSignup=true")}>
            Get Started For Free
        </Button>
      </div>
    </div>
  );
}
