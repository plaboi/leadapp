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
  };

  return (
    <Button
      onClick={handleRefresh}
      variant="ghost"
      size="sm"
      disabled={isRefreshing}
      className="h-8 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
      <span className="text-sm">Refresh</span>
    </Button>
  );
}