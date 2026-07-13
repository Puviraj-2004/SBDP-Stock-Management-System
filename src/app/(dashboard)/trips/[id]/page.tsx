import { redirect } from "next/navigation";

export default function TripDetailRedirectPage() {
  redirect("/operations/vehicle-stock");
}
