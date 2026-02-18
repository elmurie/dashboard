import { PageHeader } from "@/components/dashboard/page-header"
export default async function Page() {
    return (
        <div className="w-full">
            <PageHeader
                title="Dashboard"
            />

            {/* Scroll container */}
            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-screen-2xl py-6">
                    
                </div>
            </main>
        </div>
    )
}