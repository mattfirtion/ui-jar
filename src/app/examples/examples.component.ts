import { Component, OnInit, Compiler, Injector, ViewContainerRef, ViewChild, Inject, OnDestroy, ComponentRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector: 'ui-jar-example',
    template: `
        <div class="example-container">
            <div #example></div>
        </div>
    `
})
export class ExamplesComponent implements OnDestroy {
    @ViewChild('example', { read: ViewContainerRef }) content: ViewContainerRef;
    private modules: any = [];
    private routerSub: Subscription;

    constructor(private compiler: Compiler,
                private parentInjector: Injector,
                private activatedRoute: ActivatedRoute,
                private router: Router,
                @Inject('AppData') private appData: any) { }

    ngOnInit(): void {
        this.routerSub = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.createView();
            }
        });

        this.modules = this.appData.modules;
        this.createView();
    }

    ngOnDestroy(): void {
        if (this.routerSub) {
            this.routerSub.unsubscribe();
        }
    }

    private getCurrentComponentName(): string {
        const lastUrlSegmentIndex = this.activatedRoute.snapshot.pathFromRoot[0].firstChild.url.length - 1;
        return this.activatedRoute.snapshot.pathFromRoot[0].firstChild.url[lastUrlSegmentIndex].path;
    }

    private getComponentExamples(componentKey: string): string[] {
        let moduleDependencyName = this.appData.components[decodeURI(componentKey)].moduleDependencies[0];
        return this.appData.examples[moduleDependencyName];
    }

    private getComponentModuleImports(componentKey: string) {
        const dependencies = this.appData.components[decodeURI(componentKey)].moduleDependencies;
        let imports = [];

        dependencies.forEach((moduleName) => {
            this.modules.forEach((moduleRef) => {
                if (moduleName === moduleRef.name) {
                    imports.push(moduleRef);
                }
            });
        });

        return imports;
    }

    private createView() {
        this.createComponent(null);
    }

    refreshComponent(template: string) {
        this.createComponent(template);
    }

    private createComponent(overrideTemplate: string) {
        const importModule = this.getComponentModuleImports(this.getCurrentComponentName())[0];
        const examples = this.getComponentExamples(this.getCurrentComponentName());

        this.content.clear();
        this.compiler.clearCache();

        let moduleFactory = this.compiler.compileModuleSync(importModule);
        let moduleRef: any = moduleFactory.create(this.parentInjector);

        moduleRef.componentFactoryResolver._factories.forEach((component) => {
            let componentReference = component.componentType;
            let componentFactory = moduleRef.componentFactoryResolver.resolveComponentFactory(componentReference);

            examples.forEach((example: any) => {
                let componentRef = this.content.createComponent(componentFactory);
                this.setComponentProperties(componentRef, example);
            });
        });
    }

    private setComponentProperties(componentRef: ComponentRef<any>, componentProperties) {
        componentProperties.map((propItem) => {
            return propItem.expression.replace(propItem.name, 'componentInstance');
        }).forEach((propertyExpression) => {
            const componentInstance = componentRef.instance;
            eval(propertyExpression);
        });
    }
}