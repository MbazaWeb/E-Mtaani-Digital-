import React from "react";
import type { ViewName } from "@/types";
import { LayoutDashboard, Plus, User, ClipboardList, Shield, Building2, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { SidebarItem } from "@/components/ui/SidebarItem";

interface SidebarProps {
  currentView: string;
  setView: (view: ViewName) => void;
}

export function Sidebar({ currentView, setView }: SidebarProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  if (!user) return null;

  const role = user.role;
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);

  return (
    <aside className="w-64 bg-white border-r border-stone-200 hidden lg:flex flex-col p-4 gap-2">
      <SidebarItem
        icon={<LayoutDashboard size={20} />}
        label={L("Dashibodi", "Dashboard")}
        active={
          currentView === "dashboard" ||
          currentView === "admin_dashboard" ||
          currentView === "staff_dashboard"
        }
        onClick={() => {
          if (role === "admin") setView("admin_dashboard");
          else if (role === "staff") setView("staff_dashboard");
          else setView("dashboard");
        }}
      />

      {role === "citizen" && (
        <>
          <SidebarItem
            icon={<Plus size={20} />}
            label={L("Huduma", "Services")}
            active={
              currentView === "services" ||
              currentView === "apply" ||
              currentView === "applications" ||
              currentView === "my_payments"
            }
            onClick={() => setView("services")}
          />
          <SidebarItem
            icon={<User size={20} />}
            label={L("Wasifu", "Profile")}
            active={currentView === "profile"}
            onClick={() => setView("profile")}
          />
        </>
      )}

      {role === "staff" && (
        <>
          <SidebarItem
            icon={<ClipboardList size={20} />}
            label={L("Maombi", "Applications")}
            active={currentView === "application_review"}
            onClick={() => setView("application_review")}
          />
          <SidebarItem
            icon={<UserCheck size={20} />}
            label={L("Uhakiki", "Verification")}
            active={currentView === "manual_verification"}
            onClick={() => setView("manual_verification")}
          />
          <SidebarItem
            icon={<User size={20} />}
            label={L("Wasifu", "Profile")}
            active={currentView === "profile"}
            onClick={() => setView("profile")}
          />
        </>
      )}

      {role === "admin" && (
        <>
          <SidebarItem
            icon={<Shield size={20} />}
            label={L("Usimamizi wa Watumiaji", "Users Management")}
            active={currentView === "staff_management" || currentView === "citizen_management"}
            onClick={() => setView("staff_management")}
          />
          <SidebarItem
            icon={<Building2 size={20} />}
            label={L("Ofisi na Maeneo", "Offices & Locations")}
            active={currentView === "office_management" || currentView === "location_management"}
            onClick={() => setView("office_management")}
          />
        </>
      )}
    </aside>
  );
}
