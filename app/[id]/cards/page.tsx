import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function CardsPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!id) {
      router.push("/");
      return;
    }
    router.push(`/${id}`);
  }, [id]);

  return <></>;
}
