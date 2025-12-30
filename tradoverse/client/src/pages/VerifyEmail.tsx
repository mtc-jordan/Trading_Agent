import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
    token ? "loading" : "no-token"
  );
  const [message, setMessage] = useState("");

  const verifyMutation = trpc.user.verifyEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setStatus("success");
        setMessage(result.message || "Your email has been verified successfully!");
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to verify email");
      }
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message);
    },
  });

  useEffect(() => {
    if (token && status === "loading") {
      verifyMutation.mutate({ token });
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            )}
            {status === "error" && (
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            )}
            {status === "no-token" && (
              <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-yellow-500" />
              </div>
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
            {status === "no-token" && "No Verification Token"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address."}
            {status === "success" && message}
            {status === "error" && message}
            {status === "no-token" && "No verification token was provided in the URL."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && (
            <Button 
              className="w-full" 
              onClick={() => setLocation("/dashboard")}
            >
              Go to Dashboard
            </Button>
          )}
          {status === "error" && (
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setLocation("/settings")}
              >
                Go to Settings
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You can request a new verification email from your settings page.
              </p>
            </div>
          )}
          {status === "no-token" && (
            <Button 
              className="w-full" 
              onClick={() => setLocation("/settings")}
            >
              Go to Settings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
