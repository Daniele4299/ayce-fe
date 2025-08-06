import {
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
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
    icon: IconTypography,
    href: "/private/admin/tavoli",
  },
  {
    id: uniqueId(),
    title: "Gestione Prodotti",
    icon: IconCopy,
    href: "/private/admin/prodotti",
  },
  {
    navlabel: true,
    subheader: "AUTENTICAZIONE",
  },
  {
    id: uniqueId(),
    title: "Gestione Utenze",
    icon: IconLogin,
    href: "/private/admin/utenze",
  },
  {
    navlabel: true,
    subheader: "ALTRO",
  },
  {
    id: uniqueId(),
    title: "Impostazioni",
    icon: IconMoodHappy,
    href: "/private/admin/impostazioni",
  },

];

export default Menuitems;


