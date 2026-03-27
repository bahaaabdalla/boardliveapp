import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">404 - Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The session or page you are looking for does not exist, or you may need to sign in first.
      </p>
      
      <Link href="/">
        <Button>
          Go to Home
        </Button>
      </Link>
    </div>
  );
}
