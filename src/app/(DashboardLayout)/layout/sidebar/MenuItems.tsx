import {
  IconLayoutDashboard,
  IconSticker2,
  IconSettings,
  IconGraph,
  IconUser,
  IconChefHat
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },

  {
    id: uniqueId(),
    title: "Comande",
    icon: IconLayoutDashboard,
    href: "/private/admin/comande",
  },
  {
    navlabel: true,
    subheader: "GESTIONE",
  },
  {
    id: uniqueId(),
    title: "Gestione Tavoli",
    icon: IconSticker2,
    href: "/private/admin/tavoli",
  },
  {
    id: uniqueId(),
    title: "Gestione Prodotti",
    icon: IconChefHat,
    href: "/private/admin/prodotti",
  },
  {
    navlabel: true,
    subheader: "AUTENTICAZIONE",
  },
  {
    id: uniqueId(),
    title: "Gestione Utenze",
    icon: IconUser,
    href: "/private/admin/utenze",
  },
  {
    navlabel: true,
    subheader: "ALTRO",
  },
  {
    id: uniqueId(),
    title: "Statistiche",
    icon: IconGraph,
    href: "/private/admin/statistiche",
  },
  {
    id: uniqueId(),
    title: "Impostazioni",
    icon: IconSettings,
    href: "/private/admin/impostazioni",
  },

];

export default Menuitems;


