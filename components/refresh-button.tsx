"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Force a hard refresh of the page
    window.location.reload();
    
    // Alternative: Use router.refresh() with proper cache invalidation
    // router.refresh();
    // await new Promise(resolve => setTimeout(resolve, 100));
    // setIsRefreshing(false);
  };

  return (
    <Button
      onClick={handleRefresh}
      variant="outline"
      size="icon"
      disabled={isRefreshing}
      className="h-12 w-12 bg-gray-200 hover:bg-gray-300 border-gray-400"
    >
      <RefreshCw className={`h-12 w-12 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
}
