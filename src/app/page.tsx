"use client";

import Generate from "@/components/fuzzy/Generate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("generate");
  return (
    <div className="flex flex-col items-center justify-center w-full h-full not-visited:py-10">
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold text-center mb-2">
          Биометрический Генератор Кошельков
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Создавайте и восстанавливайте криптокошельки на основе вашей биометрии
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Генерация</TabsTrigger>
          <TabsTrigger value="recover-file">
            Восстановление из файла
          </TabsTrigger>
          <TabsTrigger value="recover-address">
            Восстановление по адресу
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Generate />
        </TabsContent>

        <TabsContent value="recover-file">
          Recover private key from helper data file
        </TabsContent>

        <TabsContent value="recover-address">
          Recover private key from wallet address
        </TabsContent>
      </Tabs>
    </div>
  );
}
