import { LogReadingProvider } from "@lectio/components/LogReadingProvider";
import { AppWrapper } from "@shared/components/AppWrapper";
import type { PropsWithChildren } from "react";

export default function UserLayout({ children }: PropsWithChildren) {
	return (
		<AppWrapper>
			<LogReadingProvider>{children}</LogReadingProvider>
		</AppWrapper>
	);
}
