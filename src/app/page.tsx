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
  const [animationStarted, setAnimationStarted] = useState(false);

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

  useEffect(() => {
    // Start the animation only after loader is complete
    if (loaderComplete) {
      const timer = setTimeout(() => {
        setAnimationStarted(true);
      }, 800);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [loaderComplete]);

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
        
        {/* UNITY in VOYAGE -> UNIVO Animation */}
        <div className="mb-4 relative w-full max-w-4xl overflow-visible italic" style={{ height: '80px' }}>
          <div className="absolute left-8 top-0 text-6xl font-bold whitespace-nowrap flex items-center">
            <span className="text-blue-500 font-extrabold text-[5rem]">UNI</span>
            <span 
              className="text-gray-400 inline-block transition-all duration-[2000ms] ease-out font-extrabold text-[5rem]"
              style={{
                opacity: animationStarted ? 0 : 1,
                maxWidth: animationStarted ? '0px' : '250px',
                overflow: 'hidden'
              }}
            >
              TY&nbsp;in&nbsp;
            </span>
            <span className="text-blue-500 font-extrabold text-[5rem]">VO</span>
            <span 
              className="text-gray-400 inline-block transition-all duration-[2000ms] ease-out font-extrabold text-[5rem]"
              style={{
                opacity: animationStarted ? 0 : 1,
                maxWidth: animationStarted ? '0px' : '250px',
                overflow: 'hidden'
              }}
            >
              YAGE
            </span>
          </div>
        </div>

        <div className="w-full max-w-4xl pl-8">
          <h1 className="text-4xl font-bold text-gray-800">
            <p>
              Vacations are better{" "}
              <span className="text-blue-500 font-extrabold text-5xl animate-fadeInUp">
                Together
              </span>
            </p>
          </h1>
        </div>
        
        <Button 
          className="mt-4 py-8 px-5 font-bold text-lg bg-green_primary text-white hover:bg-green_primary/80"
          onClick={() => router.push("/signup?isSignup=true")}
        >
          Get Started For Free
        </Button>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out 0.5s both;
        }
      `}</style>
    </div>
  );
}