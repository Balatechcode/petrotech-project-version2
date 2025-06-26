"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, Shield, Mail, Key, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingForgotPassword, setIsLoadingForgotPassword] = useState(false);
  const [isLoadingResend, setIsLoadingResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        console.log("Checking auth status:", user);

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          if (profile?.is_admin) {
            router.push("/admin");
            return;
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error === "access_denied" && errorDescription?.includes("expired")) {
      setMessage("Email verification link has expired. Please request a new verification email.");
      setMessageType("error");
    } else if (error) {
      setMessage(errorDescription || "An authentication error occurred");
      setMessageType("error");
    }
  }, [searchParams]);

  useEffect(() => {
    if (signUpData.password) {
      calculatePasswordStrength(signUpData.password);
    }
  }, [signUpData.password]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
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

      if (data.user && !data.user.email_confirmed_at) {
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

    if (passwordStrength < 3) {
      setMessage("Password must be stronger (at least 3/4 strength)");
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
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error("Email already registered. Please sign in instead.");
        }
        throw error;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: signUpData.fullName,
            email: signUpData.email,
            is_admin: true,
          });

        if (profileError) throw profileError;

        setMessage("Admin account created! Check your email for verification.");
        setMessageType("success");
        setSignUpData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
        });
        setActiveTab("signin");
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
          redirectTo: `${window.location.origin}/auth/reset-password`,
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
          emailRedirectTo: `${window.location.origin}/auth`,
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

  const PasswordStrengthMeter = () => {
    if (!signUpData.password) return null;
    
    return (
      <div className="mt-2">
        <div className="flex gap-1 mb-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-sm ${
                passwordStrength >= i ? 
                  i >= 3 ? "bg-green-500" : 
                  i === 2 ? "bg-yellow-500" : "bg-red-500" 
                : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-600">
          {passwordStrength < 2 ? "Weak" : 
           passwordStrength < 3 ? "Moderate" : 
           passwordStrength < 4 ? "Strong" : "Very Strong"}
        </p>
      </div>
    );
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

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

              <Tabs 
                defaultValue="signin" 
                className="w-full"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
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
                        <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      </div>
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
                        <Key className="absolute right-10 top-3 h-4 w-4 text-gray-400" />
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
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing In...
                        </>
                      ) : "Sign In"}
                    </Button>

                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={handleForgotPassword}
                        disabled={isLoadingForgotPassword}
                      >
                        {isLoadingForgotPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : "Forgot Password?"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={handleResendVerification}
                        disabled={isLoadingResend}
                      >
                        {isLoadingResend ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : "Resend Verification Email"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
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
                        <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
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
                        <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      </div>
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
                        <Key className="absolute right-10 top-3 h-4 w-4 text-gray-400" />
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
                      <PasswordStrengthMeter />
                      <div className="text-xs text-gray-500 mt-1">
                        Password must contain:
                        <ul className="list-disc pl-5">
                          <li>At least 8 characters</li>
                          <li>One uppercase letter</li>
                          <li>One number</li>
                          <li>One special character</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-confirm-password">
                        Confirm Password
                      </Label>
                      <div className="relative">
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
                        <Key className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || passwordStrength < 3}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : "Create Account"}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="font-medium text-blue-800">Note:</p>
                    <p className="text-blue-700">
                      After email verification, your admin access will be granted automatically.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="mt-6 bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-800 mb-2">Security Information</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  All accounts require email verification before access is granted.
                </p>
                <p>
                  Admin privileges are automatically granted upon verification.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For security reasons, we log all admin access attempts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}