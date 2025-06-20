"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
}

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingForgotPassword, setIsLoadingForgotPassword] = useState(false);
  const [isLoadingResend, setIsLoadingResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [signInData, setSignInData] = useState<AuthFormData>({
    email: "",
    password: "",
  });

  const [signUpData, setSignUpData] = useState<AuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    handleAuthCallback();
    checkUser();
  }, []);

  const handleAuthCallback = async () => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      if (error === "access_denied" && errorDescription?.includes("expired")) {
        setMessage("Email verification link has expired. Please request a new verification email.");
        setMessageType("error");
      } else {
        setMessage(errorDescription || "An authentication error occurred");
        setMessageType("error");
      }
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (profile?.is_admin) {
        router.push("/admin");
      }
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profile?.is_admin) {
        router.push("/auth");
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error("Invalid email or password");
        }
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
        setMessage("Please verify your email address before signing in.");
        setMessageType("error");
        await supabase.auth.signOut();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .single();

      if (!profile?.is_admin) {
        setMessage("Admin privileges required");
        setMessageType("error");
        await supabase.auth.signOut();
        return;
      }

      setMessage("Sign in successful! Redirecting...");
      setMessageType("success");
      router.push("/admin");
      
    } catch (error: any) {
      setMessage(error.message || "Sign in failed");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

 const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setMessage("");

  if (signUpData.password !== signUpData.confirmPassword) {
    setMessage("Passwords do not match");
    setMessageType("error");
    setIsLoading(false);
    return;
  }

  if (signUpData.password.length < 8) {
    setMessage("Password must be at least 8 characters long");
    setMessageType("error");
    setIsLoading(false);
    return;
  }

  if (!/[A-Z]/.test(signUpData.password)) {
    setMessage("Password must contain at least one uppercase letter");
    setMessageType("error");
    setIsLoading(false);
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: {
          full_name: signUpData.fullName,
        },
        emailRedirectTo: `${origin}/auth`,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error("Email already registered. Please sign in instead.");
      }
      throw error;
    }

    if (data.user) {
      // Update the user's profile to set is_admin to true
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: signUpData.fullName,
          email: signUpData.email,
          is_admin: true, // Set admin role here
          created_at: new Date().toISOString(),
          // updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setMessage(
        "Admin account created successfully! Please check your email for verification."
      );
      setMessageType("success");

      setSignUpData({
        email: "",
        password: "",
        confirmPassword: "",
        fullName: "",
      });
    }
  } catch (error: any) {
    setMessage(error.message || "An error occurred during sign up");
    setMessageType("error");
  } finally {
    setIsLoading(false);
  }
};

  const handleForgotPassword = async () => {
    if (!signInData.email) {
      setMessage("Please enter your email address first");
      setMessageType("error");
      return;
    }

    setIsLoadingForgotPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        signInData.email,
        {
          redirectTo: `${origin}/auth/reset-password`,
        }
      );

      if (error) throw error;

      setMessage("Password reset email sent! Check your inbox.");
      setMessageType("success");
    } catch (error: any) {
      setMessage(error.message || "An error occurred");
      setMessageType("error");
    } finally {
      setIsLoadingForgotPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!signInData.email) {
      setMessage("Please enter your email address first");
      setMessageType("error");
      return;
    }

    setIsLoadingResend(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: signInData.email,
        options: {
          emailRedirectTo: `${origin}/auth`,
        },
      });

      if (error) throw error;

      setMessage("Verification email resent! Check your inbox.");
      setMessageType("success");
    } catch (error: any) {
      setMessage(error.message || "An error occurred");
      setMessageType("error");
    } finally {
      setIsLoadingResend(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            Admin Authentication
          </h1>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Admin Access</CardTitle>
              <p className="text-gray-600 text-sm">
                Sign in to access the admin dashboard
              </p>
            </CardHeader>
            <CardContent>
              {message && (
                <div
                  className={`mb-4 p-3 rounded-md text-sm ${
                    messageType === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInData.email}
                        onChange={(e) =>
                          setSignInData({
                            ...signInData,
                            email: e.target.value,
                          })
                        }
                        placeholder="admin@example.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={signInData.password}
                          onChange={(e) =>
                            setSignInData({
                              ...signInData,
                              password: e.target.value,
                            })
                          }
                          placeholder="Enter your password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={handleForgotPassword}
                        disabled={isLoadingForgotPassword}
                      >
                        {isLoadingForgotPassword ? "Sending..." : "Forgot Password?"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={handleResendVerification}
                        disabled={isLoadingResend}
                      >
                        {isLoadingResend ? "Sending..." : "Resend Verification Email"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        value={signUpData.fullName}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            fullName: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signUpData.email}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            email: e.target.value,
                          })
                        }
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={signUpData.password}
                          onChange={(e) =>
                            setSignUpData({
                              ...signUpData,
                              password: e.target.value,
                            })
                          }
                          placeholder="At least 8 characters with uppercase"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-confirm-password">
                        Confirm Password
                      </Label>
                      <Input
                        id="signup-confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={signUpData.confirmPassword}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm your password"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-gray-600 mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="font-medium text-yellow-800">Note:</p>
                    <p className="text-yellow-700">
                      After email verification, contact an administrator to
                      request admin privileges.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="mt-6 bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-800 mb-2">Demo Access</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  For testing purposes, create an account and I'll grant admin
                  access manually.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  * Email verification is required for all new accounts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}